const subjectSelect = document.getElementById('subjectSelect');
const chapterList = document.getElementById('chapterList');
const blueprintList = document.getElementById('blueprintList');
const generateBtn = document.getElementById('generateBtn');
const resultBox = document.getElementById('resultBox');
const totalMarksInput = document.getElementById('totalMarks');
const paperNameInput = document.getElementById('paperName');
const previewBtn = document.getElementById('previewBtn');
const downloadBtn = document.getElementById('downloadBtn');
const answerBtn = document.getElementById('answerBtn');
const selectAllBtn = document.getElementById('selectAllBtn');

async function loadSubjects() {
  const res = await fetch('/api/subjects');
  const data = await res.json();
  if (!data.subjects || !data.subjects.length) {
    subjectSelect.innerHTML = '<option value="">No subjects available</option>';
    return;
  }

  subjectSelect.innerHTML = data.subjects
    .map(subject => `<option value="${subject}">${subject}</option>`)
    .join('');

  loadChapters(subjectSelect.value);
}

async function loadChapters(subject) {
  const res = await fetch(`/api/chapters?subject=${encodeURIComponent(subject)}`);
  const data = await res.json();
  if (!data.chapters || !data.chapters.length) {
    chapterList.innerHTML = '<p>No chapters found. Import a workbook first.</p>';
    return;
  }

  chapterList.innerHTML = data.chapters.map(chapter => `
    <div class="chapter-item">
      <label>
        <input type="checkbox" checked value="${chapter}" />
        <span>${chapter}</span>
      </label>
    </div>
  `).join('');

  renderBlueprint();
}

function renderBlueprint() {
  const blueprint = [
    { name: 'Section A', type: 'MCQ', questions: 20, marks: 1 },
    { name: 'Section B', type: 'Very Short Answer', questions: 5, marks: 2 },
    { name: 'Section C', type: 'Short Answer', questions: 6, marks: 3 },
    { name: 'Section D', type: 'Long Answer', questions: 4, marks: 5 }
  ];

  blueprintList.innerHTML = blueprint.map(item => `
    <div class="blueprint-item">
      <span>${item.name}</span>
      <strong>${item.questions} × ${item.marks}</strong>
    </div>
  `).join('');
}

subjectSelect.addEventListener('change', () => loadChapters(subjectSelect.value));

selectAllBtn.addEventListener('click', () => {
  const boxes = document.querySelectorAll('#chapterList input[type="checkbox"]');
  const allChecked = Array.from(boxes).every(box => box.checked);
  boxes.forEach(box => {
    box.checked = !allChecked;
  });
});

generateBtn.addEventListener('click', async () => {
  const selectedChapters = Array.from(document.querySelectorAll('#chapterList input:checked')).map(el => el.value);
  if (!subjectSelect.value || !selectedChapters.length) {
    resultBox.classList.remove('hidden');
    resultBox.innerHTML = '<strong>Please choose a subject and at least one chapter.</strong>';
    return;
  }

  const payload = {
    paper_name: paperNameInput.value || 'Generated Paper',
    subject: subjectSelect.value,
    chapters: selectedChapters,
    total_marks: Number(totalMarksInput.value || 0),
    blueprint: {
      name: 'Default Blueprint',
      sections: [
        { name: 'Section A', question_type: 'MCQ', questions: 20, marks_per_question: 1 },
        { name: 'Section B', question_type: 'Very Short Answer', questions: 5, marks_per_question: 2 },
        { name: 'Section C', question_type: 'Short Answer', questions: 6, marks_per_question: 3 },
        { name: 'Section D', question_type: 'Long Answer', questions: 4, marks_per_question: 5 }
      ]
    }
  };

  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json();

  if (!data.success) {
    resultBox.classList.remove('hidden');
    resultBox.innerHTML = `<strong>Generation failed:</strong> ${data.error}`;
    previewBtn.classList.add('hidden');
    downloadBtn.classList.add('hidden');
    answerBtn.classList.add('hidden');
    return;
  }

  const paper = data.paper;
  sessionStorage.setItem('generatedPaper', JSON.stringify(paper));

  previewBtn.href = `/preview/${paper.id}`;
  downloadBtn.href = `/download/${paper.id}`;
  answerBtn.href = `/download-answer/${paper.id}`;
  previewBtn.classList.remove('hidden');
  downloadBtn.classList.remove('hidden');
  answerBtn.classList.remove('hidden');

  resultBox.classList.remove('hidden');
  resultBox.innerHTML = `
    <h3>${paper.name}</h3>
    <p><strong>Subject:</strong> ${paper.subject}</p>
    <p><strong>Total Marks:</strong> ${paper.total_marks}</p>
    <p><strong>Questions:</strong> ${paper.questions.length}</p>
    <p><strong>Ready to preview and download.</strong></p>
  `;
});

loadSubjects();
