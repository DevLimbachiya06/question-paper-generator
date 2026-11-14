import os
import tempfile
import unittest
from pathlib import Path


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


if __name__ == '__main__':
    unittest.main()
