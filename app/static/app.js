const subjectSelect = document.getElementById('subjectSelect');
const chapterList = document.getElementById('chapterList');
const topicList = document.getElementById('topicList');
const blueprintList = document.getElementById('blueprintList');
const generateBtn = document.getElementById('generateBtn');
const resultBox = document.getElementById('resultBox');
const totalMarksInput = document.getElementById('totalMarks');
const paperNameInput = document.getElementById('paperName');
const previewBtn = document.getElementById('previewBtn');
const downloadBtn = document.getElementById('downloadBtn');
const answerBtn = document.getElementById('answerBtn');
const selectAllBtn = document.getElementById('selectAllBtn');
const selectAllTopicsBtn = document.getElementById('selectAllTopicsBtn');
const addSectionBtn = document.getElementById('addSectionBtn');

let blueprint = [
  { name: 'Section A', type: 'MCQ', questions: 20, marks: 1 },
  { name: 'Section B', type: 'Very Short Answer', questions: 5, marks: 2 },
  { name: 'Section C', type: 'Short Answer', questions: 6, marks: 3 },
  { name: 'Section D', type: 'Long Answer', questions: 4, marks: 5 }
];

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
  loadTopics();
}

async function loadTopics() {
  const selectedChapters = Array.from(document.querySelectorAll('#chapterList input:checked'))
    .map(el => `chapter=${encodeURIComponent(el.value)}`).join('&');
  const res = await fetch(`/api/topics?subject=${encodeURIComponent(subjectSelect.value)}&${selectedChapters}`);
  const data = await res.json();
  topicList.innerHTML = data.topics && data.topics.length
    ? data.topics.map(topic => `<div class="chapter-item"><label><input type="checkbox" checked value="${topic}" /><span>${topic}</span></label></div>`).join('')
    : '<p>No topics found for the selected chapters. All topics will be used.</p>';
}

function renderBlueprint() {
  blueprintList.innerHTML = blueprint.map(item => `
    <div class="blueprint-item">
      <input class="blueprint-name" value="${item.name}" aria-label="Section name" />
      <input class="blueprint-type" value="${item.type}" aria-label="Question type" />
      <label>Questions <input class="blueprint-questions" type="number" min="0" value="${item.questions}" /></label>
      <label>Marks <input class="blueprint-marks" type="number" min="1" value="${item.marks}" /></label>
      <button class="remove-section" type="button">Remove</button>
    </div>
  `).join('');
  blueprintList.querySelectorAll('.remove-section').forEach((button, index) => {
    button.addEventListener('click', () => {
      blueprint.splice(index, 1);
      renderBlueprint();
    });
  });
}

subjectSelect.addEventListener('change', () => loadChapters(subjectSelect.value));
chapterList.addEventListener('change', loadTopics);

selectAllBtn.addEventListener('click', () => {
  const boxes = document.querySelectorAll('#chapterList input[type="checkbox"]');
  const allChecked = Array.from(boxes).every(box => box.checked);
  boxes.forEach(box => {
    box.checked = !allChecked;
  });

  selectAllTopicsBtn.addEventListener('click', () => {
    const boxes = document.querySelectorAll('#topicList input[type="checkbox"]');
    const allChecked = Array.from(boxes).every(box => box.checked);
    boxes.forEach(box => { box.checked = !allChecked; });
  });

  addSectionBtn.addEventListener('click', () => {
    blueprint.push({ name: `Section ${String.fromCharCode(65 + blueprint.length)}`, type: 'MCQ', questions: 1, marks: 1 });
    renderBlueprint();
  });
});

generateBtn.addEventListener('click', async () => {
  const selectedChapters = Array.from(document.querySelectorAll('#chapterList input:checked')).map(el => el.value);
  const selectedTopics = Array.from(document.querySelectorAll('#topicList input:checked')).map(el => el.value);
  if (!subjectSelect.value || !selectedChapters.length) {
    resultBox.classList.remove('hidden');
    resultBox.innerHTML = '<strong>Please choose a subject and at least one chapter.</strong>';
    return;
  }

  const sections = Array.from(document.querySelectorAll('.blueprint-item')).map(item => ({
    name: item.querySelector('.blueprint-name').value.trim(),
    question_type: item.querySelector('.blueprint-type').value.trim(),
    questions: Number(item.querySelector('.blueprint-questions').value || 0),
    marks_per_question: Number(item.querySelector('.blueprint-marks').value || 0)
  }));
  const payload = {
    paper_name: paperNameInput.value || 'Generated Paper',
    subject: subjectSelect.value,
    chapters: selectedChapters,
    topics: selectedTopics,
    total_marks: Number(totalMarksInput.value || 0),
    max_marks: Number(totalMarksInput.value || 0),
    blueprint: { name: 'Custom Blueprint', sections }
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
