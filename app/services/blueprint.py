DEFAULT_BLUEPRINTS = {
    'Mathematics': {
        'name': 'Mathematics Standard',
        'sections': [
            {'name': 'Section A', 'question_type': 'MCQ', 'questions': 20, 'marks_per_question': 1},
            {'name': 'Section B', 'question_type': 'Very Short Answer', 'questions': 5, 'marks_per_question': 2},
            {'name': 'Section C', 'question_type': 'Short Answer', 'questions': 6, 'marks_per_question': 3},
            {'name': 'Section D', 'question_type': 'Long Answer', 'questions': 4, 'marks_per_question': 5},
            {'name': 'Section E', 'question_type': 'Case Study', 'questions': 3, 'marks_per_question': 4},
        ]
    },
    'Science': {
        'name': 'Science Blueprint',
        'sections': [
            {'name': 'Section A', 'question_type': 'MCQ', 'questions': 16, 'marks_per_question': 1},
            {'name': 'Section B', 'question_type': 'Very Short Answer', 'questions': 6, 'marks_per_question': 2},
            {'name': 'Section C', 'question_type': 'Short Answer', 'questions': 7, 'marks_per_question': 3},
            {'name': 'Section D', 'question_type': 'Long Answer', 'questions': 4, 'marks_per_question': 5},
        ]
    },
    'English': {
        'name': 'English Blueprint',
        'sections': [
            {'name': 'Section A', 'question_type': 'Reading', 'questions': 5, 'marks_per_question': 2},
            {'name': 'Section B', 'question_type': 'Writing', 'questions': 3, 'marks_per_question': 5},
            {'name': 'Section C', 'question_type': 'Literature', 'questions': 6, 'marks_per_question': 3},
        ]
    }
}


def default_blueprints():
    return DEFAULT_BLUEPRINTS
