const content = document.getElementById('previewContent');
const title = document.getElementById('paperTitle');
const meta = document.getElementById('paperMeta');
const downloadWord = document.getElementById('downloadWord');
const downloadAnswer = document.getElementById('downloadAnswer');

const pathParts = window.location.pathname.split('/');
const paperId = pathParts[pathParts.length - 1];

async function loadPaper() {
  if (!paperId || Number.isNaN(Number(paperId))) {
    content.innerHTML = '<p>No paper selected.</p>';
    return;
  }

  const response = await fetch(`/api/papers/${paperId}`);
  if (!response.ok) {
    content.innerHTML = '<p>Paper not found.</p>';
    return;
  }

  const result = await response.json();
  const paper = result.paper;

  title.textContent = paper.name;
  meta.innerHTML = `
    <span>Subject: ${paper.subject}</span>
    <span>Total Marks: ${paper.total_marks}</span>
    <span>Questions: ${paper.questions.length}</span>
  `;
  downloadWord.href = paper.download_url;
  downloadAnswer.href = paper.answer_url;

  content.innerHTML = paper.questions.map((q, index) => `
    <article class="question-card">
      <div class="question-head">
        <span>Q${index + 1}</span>
        <span>${q.marks} marks</span>
      </div>
      <p class="question-text">${q.question_text}</p>
      <ul class="options-list">
        ${q.options.filter(Boolean).map((opt, idx) => `<li>${String.fromCharCode(65 + idx)}. ${opt}</li>`).join('')}
      </ul>
    </article>
  `).join('');
}

loadPaper();
