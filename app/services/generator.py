import json
import os
import random
from collections import defaultdict
from datetime import datetime

from docx import Document

from app.services.db import get_db


def normalize_blueprint(subject, blueprint):
    if not blueprint:
        return {
            'name': f'{subject} Paper',
            'sections': [{
                'name': 'Section A',
                'question_type': 'MCQ',
                'questions': 10,
                'marks_per_question': 1,
            }],
        }
    return blueprint


def get_subject_questions(subject, chapters=None):
    db = get_db()
    query = 'SELECT * FROM questions WHERE subject = ? AND active = 1'
    params = [subject]
    if chapters:
        placeholders = ', '.join('?' for _ in chapters)
        query += f' AND chapter IN ({placeholders})'
        params.extend(chapters)
    rows = db.execute(query, params).fetchall()
    db.close()
    return rows


def generate_question_paper(payload):
    subject = payload.get('subject')
    chapters = payload.get('chapters') or []
    total_marks = int(payload.get('total_marks', 0) or 0)
    blueprint = normalize_blueprint(subject, payload.get('blueprint'))

    if not subject:
        raise ValueError('A subject is required.')
    if total_marks <= 0:
        raise ValueError('Total marks must be greater than zero.')

    rows = get_subject_questions(subject, chapters)
    if not rows:
        raise ValueError('No active questions are available for the selected subject/chapters.')

    chosen = []
    used_ids = set()

    section_order = blueprint.get('sections', [])
    if not section_order:
        raise ValueError('The selected blueprint has no sections.')

    for section in section_order:
        qtype = section.get('question_type')
        qcount = int(section.get('questions', 0) or 0)
        marks_per = int(section.get('marks_per_question', 1) or 1)
        if qcount <= 0:
            continue
        matches = [
            r for r in rows
            if r['question_type'] == qtype
            and r['marks'] == marks_per
            and r['question_id'] not in used_ids
        ]
        take = min(qcount, len(matches))
        if take > 0:
            selected = random.sample(matches, take)
            chosen.extend(selected)
            used_ids.update(r['question_id'] for r in selected)

    if sum(item['marks'] for item in chosen) < total_marks:
        extras = [item for item in rows if item['question_id'] not in used_ids]
        extras = sorted(extras, key=lambda x: (x['marks'], x['question_type']), reverse=True)
        for item in extras:
            if sum(q['marks'] for q in chosen) >= total_marks:
                break
            chosen.append(item)
            used_ids.add(item['question_id'])

    final_total = sum(item['marks'] for item in chosen)
    if final_total < total_marks:
        raise ValueError('The selected question bank cannot reach the required total marks within the current constraints.')

    paper = {
        'name': payload.get('paper_name') or f'{subject} Question Paper',
        'subject': subject,
        'total_marks': final_total,
        'chapters': chapters,
        'blueprint': blueprint,
        'questions': [
            {
                'question_id': q['question_id'],
                'subject': q['subject'],
                'chapter': q['chapter'],
                'question_type': q['question_type'],
                'marks': q['marks'],
                'difficulty': q['difficulty'],
                'question_text': q['question_text'],
                'options': [
                    q['option_a'],
                    q['option_b'],
                    q['option_c'],
                    q['option_d'],
                ],
                'correct_answer': q['correct_answer'],
            }
            for q in chosen
        ],
    }

    paper['id'] = create_generated_paper_record(paper)
    return paper


def create_generated_paper_record(paper):
    db = get_db()
    document_dir = os.path.join(os.environ.get('DATA_DIR', os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'data')), 'generated')
    os.makedirs(document_dir, exist_ok=True)
    question_ids = [q['question_id'] for q in paper['questions']]
    stamp = datetime.now().strftime('%Y%m%d%H%M%S')
    docx_path = os.path.join(document_dir, f"{paper['subject']}_{stamp}.docx")
    answer_path = os.path.join(document_dir, f"{paper['subject']}_{stamp}_answer_key.docx")

    create_docx_document(paper, docx_path)
    create_answer_key_document(paper, answer_path)

    cursor = db.execute(
        '''
        INSERT INTO generated_papers (name, subject, total_marks, blueprint, question_ids, docx_path, answer_key_path)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ''',
        (
            paper['name'],
            paper['subject'],
            paper['total_marks'],
            json.dumps(paper['blueprint']),
            ','.join(question_ids),
            docx_path,
            answer_path,
        ),
    )
    db.commit()
    paper_id = cursor.lastrowid
    db.close()
    return paper_id


def create_docx_document(paper, docx_path):
    doc = Document()
    doc.add_heading(paper['name'], 0)
    doc.add_paragraph(f'Subject: {paper["subject"]}')
    doc.add_paragraph(f'Total Marks: {paper["total_marks"]}')
    doc.add_paragraph('')

    for i, q in enumerate(paper['questions'], start=1):
        text = f"{i}. {q['question_text']} ({q['marks']} marks)"
        doc.add_paragraph(text)
        options = [opt for opt in q['options'] if opt]
        for idx, opt in enumerate(options, start=1):
            doc.add_paragraph(f'   {chr(64 + idx)}. {opt}')
        doc.add_paragraph('')

    doc.save(docx_path)


def create_answer_key_document(paper, answer_path):
    doc = Document()
    doc.add_heading(f'{paper["name"]} - Answer Key', 0)
    for i, q in enumerate(paper['questions'], start=1):
        answer = q.get('correct_answer') or 'Not provided'
        doc.add_paragraph(f'{i}. {answer}')
    doc.save(answer_path)


def create_exam_documents(paper):
    pass
