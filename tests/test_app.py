import os
import tempfile
import unittest
from pathlib import Path

from openpyxl import Workbook


class AppSmokeTest(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        os.environ['DATA_DIR'] = self.temp_dir.name
        os.environ['SECRET_KEY'] = 'test-secret'

        from app import create_app

        self.app = create_app()
        self.client = self.app.test_client()

    def tearDown(self):
        self.temp_dir.cleanup()
        os.environ.pop('DATA_DIR', None)
        os.environ.pop('SECRET_KEY', None)

    def test_health_endpoint(self):
        response = self.client.get('/health')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json, {'status': 'ok'})

    def test_homepage_and_storage_are_available(self):
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(Path(self.temp_dir.name, 'question_bank.db').exists())
        self.assertTrue(Path(self.temp_dir.name, 'uploads').is_dir())

    def test_topic_endpoint_supports_topic_only_banks(self):
        workbook = Workbook()
        sheet = workbook.active
        sheet.append(['Question_ID', 'Subject', 'Topic', 'Question_Type', 'Marks', 'Question_Text'])
        sheet.append(['Q1', 'Physics', 'Motion', 'MCQ', 1, 'What is speed?'])
        path = Path(self.temp_dir.name, 'topic-bank.xlsx')
        workbook.save(path)

        from app.services.importer import import_question_bank

        result = import_question_bank(str(path))
        self.assertTrue(result['success'])
        response = self.client.get('/api/topics?subject=Physics&chapter=Motion')
        self.assertEqual(response.json, {
            'topics': ['Motion'],
            'topic_counts': {'Motion': 1},
        })

    def test_chapter_endpoint_includes_question_counts(self):
        response = self.client.get('/api/chapters?subject=Physics')
        self.assertEqual(response.status_code, 200)
        self.assertIn('chapter_counts', response.json)

    def test_generation_respects_custom_maximum_marks(self):
        workbook = Workbook()
        sheet = workbook.active
        sheet.append(['Question_ID', 'Subject', 'Chapter', 'Question_Type', 'Marks', 'Question_Text'])
        for index in range(1, 4):
            sheet.append([f'Q{index}', 'Physics', 'Motion', 'MCQ', 1, f'Question {index}'])
        path = Path(self.temp_dir.name, 'bank.xlsx')
        workbook.save(path)

        from app.services.importer import import_question_bank

        self.assertTrue(import_question_bank(str(path))['success'])
        response = self.client.post('/api/generate', json={
            'subject': 'Physics',
            'chapters': ['Motion'],
            'max_marks': 2,
            'blueprint': {
                'name': 'Custom',
                'sections': [{
                    'name': 'Section A',
                    'question_type': 'MCQ',
                    'questions': 3,
                    'marks_per_question': 1,
                }],
            },
        })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json['paper']['total_marks'], 2)


if __name__ == '__main__':
    unittest.main()
