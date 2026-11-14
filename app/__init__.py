from flask import Flask, render_template, request, redirect, url_for, flash, send_file, jsonify, abort
from werkzeug.utils import secure_filename

from app.services.db import init_db, get_db
from app.services.importer import import_question_bank
from app.services.generator import generate_question_paper

import os


def create_app():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_dir = os.environ.get('DATA_DIR', os.path.join(base_dir, 'data'))
    app = Flask(
        __name__,
        template_folder=os.path.join(base_dir, 'app', 'templates'),
        static_folder=os.path.join(base_dir, 'app', 'static')
    )
    app.secret_key = os.environ.get('SECRET_KEY', 'local-development-key')
    app.config['DATA_DIR'] = data_dir
    app.config['UPLOAD_FOLDER'] = os.path.join(data_dir, 'uploads')
    app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    init_db()

    db = get_db()
    has_questions = db.execute('SELECT 1 FROM questions LIMIT 1').fetchone()
    db.close()
    if not has_questions:
        sample_path = os.path.join(os.getcwd(), 'CBSE_Class10_Question_Bank_Starter.xlsx')
        if os.path.exists(sample_path):
            import_result = import_question_bank(sample_path)
            if not import_result.get('success'):
                print(f'Initial seed import warning: {import_result.get("message")}')

    @app.route('/')
    def index():
        db = get_db()
        subjects = db.execute('SELECT DISTINCT subject FROM questions WHERE active = 1 ORDER BY subject').fetchall()
        papers = db.execute('SELECT * FROM generated_papers ORDER BY created_at DESC LIMIT 10').fetchall()
        db.close()
        return render_template('index.html', subjects=[row[0] for row in subjects], papers=papers)

    @app.route('/upload', methods=['POST'])
    def upload_file():
        if 'file' not in request.files:
            flash('No file selected')
            return redirect(url_for('index'))

        file = request.files['file']
        if file.filename == '':
            flash('No file selected')
            return redirect(url_for('index'))

        if file and file.filename.lower().endswith('.xlsx'):
            filename = secure_filename(file.filename)
            save_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(save_path)
            try:
                result = import_question_bank(save_path)
                flash(result['message'])
                if not result['success']:
                    return redirect(url_for('index'))
            except Exception as exc:
                flash(f'Import failed: {exc}')
                return redirect(url_for('index'))
            return redirect(url_for('index'))

        flash('Only .xlsx files are supported at the moment.')
        return redirect(url_for('index'))

    @app.route('/api/subjects')
    def api_subjects():
        db = get_db()
        rows = db.execute('SELECT DISTINCT subject FROM questions WHERE active = 1 ORDER BY subject').fetchall()
        db.close()
        return jsonify({'subjects': [r[0] for r in rows]})

    @app.route('/api/chapters')
    def api_chapters():
        subject = request.args.get('subject', '')
        db = get_db()
        rows = db.execute(
            "SELECT DISTINCT chapter FROM questions WHERE active = 1 AND subject = ? ORDER BY chapter",
            (subject,)
        ).fetchall()
        db.close()
        return jsonify({'chapters': [r[0] for r in rows]})

    @app.route('/api/topics')
    def api_topics():
        subject = request.args.get('subject', '')
        chapters = [value for value in request.args.getlist('chapter') if value]
        db = get_db()
        query = 'SELECT DISTINCT topic FROM questions WHERE active = 1 AND subject = ? AND topic != ""'
        params = [subject]
        if chapters:
            placeholders = ', '.join('?' for _ in chapters)
            query += f' AND chapter IN ({placeholders})'
            params.extend(chapters)
        rows = db.execute(query + ' ORDER BY topic', params).fetchall()
        db.close()
        return jsonify({'topics': [r[0] for r in rows]})

    @app.route('/api/generate', methods=['POST'])
    def api_generate():
        payload = request.get_json(force=True, silent=True) or {}
        try:
            paper = generate_question_paper(payload)
            return jsonify({'success': True, 'paper': paper})
        except Exception as exc:
            return jsonify({'success': False, 'error': str(exc)}), 400

    @app.route('/api/papers/<int:paper_id>')
    def api_paper(paper_id):
        db = get_db()
        row = db.execute('SELECT * FROM generated_papers WHERE id = ?', (paper_id,)).fetchone()
        if not row:
            db.close()
            return jsonify({'error': 'Paper not found'}), 404

        question_ids = [qid for qid in row['question_ids'].split(',') if qid]
        if question_ids:
            placeholders = ', '.join('?' for _ in question_ids)
            questions = db.execute(
                f'SELECT * FROM questions WHERE question_id IN ({placeholders})',
                tuple(question_ids),
            ).fetchall()
            question_map = {q['question_id']: dict(q) for q in questions}
            ordered_questions = [question_map[qid] for qid in question_ids if qid in question_map]
        else:
            ordered_questions = []

        paper = {
            'id': row['id'],
            'name': row['name'],
            'subject': row['subject'],
            'total_marks': row['total_marks'],
            'download_url': url_for('download_paper', paper_id=row['id']),
            'answer_url': url_for('download_answer', paper_id=row['id']),
            'questions': [{
                'question_id': q['question_id'],
                'chapter': q['chapter'],
                'question_type': q['question_type'],
                'marks': q['marks'],
                'question_text': q['question_text'],
                'options': [q['option_a'], q['option_b'], q['option_c'], q['option_d']],
                'correct_answer': q['correct_answer'],
            } for q in ordered_questions],
        }
        db.close()
        return jsonify({'paper': paper})

    @app.route('/preview/<int:paper_id>')
    def preview_page(paper_id):
        db = get_db()
        row = db.execute('SELECT * FROM generated_papers WHERE id = ?', (paper_id,)).fetchone()
        db.close()
        if not row:
            abort(404)
        return render_template('preview.html', paper_id=paper_id)

    @app.route('/download/<int:paper_id>')
    def download_paper(paper_id):
        db = get_db()
        row = db.execute('SELECT * FROM generated_papers WHERE id = ?', (paper_id,)).fetchone()
        if not row:
            abort(404)
        if row['docx_path'] and os.path.exists(row['docx_path']):
            return send_file(row['docx_path'], as_attachment=True)
        return 'Document not found', 404

    @app.route('/download-answer/<int:paper_id>')
    def download_answer(paper_id):
        db = get_db()
        row = db.execute('SELECT * FROM generated_papers WHERE id = ?', (paper_id,)).fetchone()
        if not row:
            abort(404)
        if row['answer_key_path'] and os.path.exists(row['answer_key_path']):
            return send_file(row['answer_key_path'], as_attachment=True)
        return 'Answer key not found', 404

    @app.route('/health')
    def health():
        return {'status': 'ok'}

    return app


app = create_app()
