import os
import sqlite3
from collections import defaultdict
from openpyxl import load_workbook

from app.services.db import get_db

REQUIRED_COLUMNS = {
    'Question_ID': 'question_id',
    'Subject': 'subject',
    'Chapter': 'chapter',
    'Topic': 'topic',
    'Question_Type': 'question_type',
    'Marks': 'marks',
    'Difficulty': 'difficulty',
    'Question_Text': 'question_text',
    'Option_A': 'option_a',
    'Option_B': 'option_b',
    'Option_C': 'option_c',
    'Option_D': 'option_d',
    'Correct_Answer': 'correct_answer',
    'Answer_Key': 'answer_key',
    'Source': 'source',
    'Year': 'year',
    'Active': 'active',
}


def normalize_value(value):
    if value is None:
        return ''
    return str(value).strip()


def import_question_bank(file_path):
    if not os.path.exists(file_path):
        return {'success': False, 'message': 'File not found.'}

    workbook = load_workbook(file_path, data_only=True)
    if not workbook.worksheets:
        return {'success': False, 'message': 'Workbook is empty.'}

    sheet = workbook[workbook.sheetnames[0]]
    rows = list(sheet.iter_rows(values_only=True))
    if not rows:
        return {'success': False, 'message': 'Workbook contains no data rows.'}

    headers = [normalize_value(h) if h is not None else '' for h in rows[0]]
    missing = [expected for expected in REQUIRED_COLUMNS if expected not in headers]
    if missing:
        return {'success': False, 'message': f'Missing required columns: {", ".join(missing)}'}

    index_map = {header: idx for idx, header in enumerate(headers)}
    inserted = 0
    errors = []
    conn = get_db()

    try:
        for row_num, row in enumerate(rows[1:], start=2):
            values = list(row)
            if len(values) < len(headers):
                values.extend([''] * (len(headers) - len(values)))

            record = {column: values[index_map.get(header, -1)] if header in index_map and index_map[header] < len(values) else '' for header, column in REQUIRED_COLUMNS.items()}

            qid = normalize_value(record['question_id'])
            if not qid:
                errors.append(f'Row {row_num}: Missing Question_ID')
                continue

            subject = normalize_value(record['subject'])
            chapter = normalize_value(record['chapter'])
            qtype = normalize_value(record['question_type'])
            qtext = normalize_value(record['question_text'])
            marks_raw = normalize_value(record['marks'])

            if not subject or not chapter or not qtype or not qtext:
                errors.append(f'Row {row_num}: Missing required subject/chapter/type/question text')
                continue

            try:
                marks = int(float(str(marks_raw)))
            except (TypeError, ValueError):
                errors.append(f'Row {row_num}: Invalid marks value: {marks_raw}')
                continue

            if marks <= 0:
                errors.append(f'Row {row_num}: Marks must be positive')
                continue

            active = 1 if str(record['active']).lower() not in ('0', 'false', 'no', 'n') else 0

            if conn.execute('SELECT 1 FROM questions WHERE question_id = ?', (qid,)).fetchone():
                errors.append(f'Row {row_num}: Duplicate Question_ID {qid} (skipped)')
                continue

            conn.execute(
                '''
                INSERT INTO questions (
                    question_id, subject, chapter, topic, question_type, marks, difficulty,
                    question_text, option_a, option_b, option_c, option_d, correct_answer,
                    answer_key, source, year, active
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''',
                (
                    qid,
                    subject,
                    chapter,
                    normalize_value(record['topic']),
                    qtype,
                    marks,
                    normalize_value(record['difficulty']),
                    qtext,
                    normalize_value(record['option_a']),
                    normalize_value(record['option_b']),
                    normalize_value(record['option_c']),
                    normalize_value(record['option_d']),
                    normalize_value(record['correct_answer']),
                    normalize_value(record['answer_key']),
                    normalize_value(record['source']),
                    normalize_value(record['year']),
                    active,
                ),
            )
            inserted += 1

        conn.commit()
    finally:
        conn.close()

    if errors and inserted == 0:
        return {'success': False, 'message': 'Import completed with validation issues: ' + '; '.join(errors[:10]), 'errors': errors}

    if errors:
        return {
            'success': True,
            'message': f'Imported {inserted} questions with {len(errors)} skipped rows.',
            'count': inserted,
            'warnings': errors,
        }

    return {'success': True, 'message': f'Successfully imported {inserted} questions.', 'count': inserted}
