"use client";

import { useEffect, useMemo, useState } from "react";
import { createCbseBlueprint, normalizeMarks } from "@/lib/cbse-blueprint";
import type { BlueprintSection, Question } from "@/types/question";

type Paper = {
  id: string;
  name: string;
  subject: string;
  totalMarks: number;
  questions: Question[];
  blueprint: BlueprintSection[];
};

const questionTypes = ["MCQ", "Very Short Answer", "Short Answer", "Long Answer", "Case Study"];

export default function HomePage() {
  const [subjects, setSubjects] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [chapters, setChapters] = useState<string[]>([]);
  const [chapterCounts, setChapterCounts] = useState<Record<string, number>>({});
  const [topics, setTopics] = useState<string[]>([]);
  const [topicCounts, setTopicCounts] = useState<Record<string, number>>({});
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [paperName, setPaperName] = useState("CBSE Sample Paper");
  const [totalMarks, setTotalMarks] = useState(80);
  const [sections, setSections] = useState<BlueprintSection[]>(() => createCbseBlueprint("", 80));
  const [questions, setQuestions] = useState<Question[] | undefined>();
  const [paper, setPaper] = useState<Paper | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadMetadata(nextSubject: string, nextChapters: string[] = []) {
    const query = new URLSearchParams();
    if (nextSubject) query.set("subject", nextSubject);
    nextChapters.forEach((chapter) => query.append("chapter", chapter));
    const response = await fetch(`/api/questions?${query}`);
    const data = await response.json();
    setChapters(data.chapters || []);
    setChapterCounts(data.chapterCounts || {});
    setTopics(data.topics || []);
    setTopicCounts(data.topicCounts || {});
  }

  useEffect(() => {
    fetch("/api/questions")
      .then((response) => response.json())
      .then((data) => {
        setSubjects(data.subjects || []);
        const firstSubject = data.subjects?.[0] || "";
        setSubject(firstSubject);
        setSections(createCbseBlueprint(firstSubject, 80));
        if (firstSubject) loadMetadata(firstSubject);
      })
      .catch(() => setMessage("The question bank could not be loaded."));
  }, []);

  const blueprintMarks = useMemo(
    () => sections.reduce((sum, section) => sum + section.questionCount * section.marksPerQuestion, 0),
    [sections],
  );
  const previewSections = useMemo(() => {
    if (!paper) return [];
    let questionIndex = 0;
    return paper.blueprint.map((section) => {
      const sectionQuestions = paper.questions.slice(questionIndex, questionIndex + section.questionCount);
      questionIndex += sectionQuestions.length;
      return { section, questions: sectionQuestions };
    });
  }, [paper]);

  function changeSubject(nextSubject: string) {
    setSubject(nextSubject);
    setSections(createCbseBlueprint(nextSubject, totalMarks));
    setSelectedChapters([]);
    setSelectedTopics([]);
    loadMetadata(nextSubject);
  }

  function changeTotalMarks(value: number) {
    const nextTotal = normalizeMarks(value);
    setTotalMarks(nextTotal);
    setSections(createCbseBlueprint(subject, nextTotal));
    setPaper(null);
  }

  function toggleChapter(chapter: string) {
    const next = selectedChapters.includes(chapter)
      ? selectedChapters.filter((value) => value !== chapter)
      : [...selectedChapters, chapter];
    setSelectedChapters(next);
    setSelectedTopics([]);
    loadMetadata(subject, next);
  }

  function updateSection(id: string, patch: Partial<BlueprintSection>) {
    const next = sections.map((section) => section.id === id ? { ...section, ...patch } : section);
    setSections(next);
    setTotalMarks(next.reduce((sum, section) => sum + section.questionCount * section.marksPerQuestion, 0));
    setPaper(null);
  }

  function replaceSections(next: BlueprintSection[]) {
    setSections(next);
    setTotalMarks(next.reduce((sum, section) => sum + section.questionCount * section.marksPerQuestion, 0));
    setPaper(null);
  }

  async function generate() {
    setMessage("");
    setLoading(true);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paperName,
          subject,
          chapters: selectedChapters,
          topics: selectedTopics,
          totalMarks,
          blueprint: sections,
          questions,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Generation failed.");
      setPaper(data.paper);
      setMessage("Paper generated successfully.");
    } catch (error) {
      setPaper(null);
      setMessage(error instanceof Error ? error.message : "Generation failed.");
    } finally {
      setLoading(false);
    }
  }

  async function upload(file: File | undefined) {
    if (!file) return;
    setMessage("Importing workbook...");
    const body = new FormData();
    body.append("file", file);
    const response = await fetch("/api/upload", { method: "POST", body });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || "Import failed.");
      return;
    }
    setQuestions(data.questions);
    const importedSubjects = [...new Set((data.questions as Question[]).map((question) => question.subject))].sort();
    setSubjects(importedSubjects);
    const importedSubject = importedSubjects[0] || "";
    setSubject(importedSubject);
    setSections(createCbseBlueprint(importedSubject, totalMarks));
    setSelectedChapters([]);
    setSelectedTopics([]);
    await loadMetadata(importedSubject);
    setMessage(`Imported ${data.count} questions for this session.`);
  }

  async function downloadPdf() {
    if (!paper) return;
    const response = await fetch("/api/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(paper),
    });
    if (!response.ok) {
      setMessage("The PDF could not be generated.");
      return;
    }
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = url;
    link.download = `${paper.name.replace(/[^a-z0-9-_ ]/gi, "").trim() || "question-paper"}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function downloadAnswerKey() {
    if (!paper) return;
    const response = await fetch("/api/answer-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(paper),
    });
    if (!response.ok) {
      setMessage("The answer key could not be generated.");
      return;
    }
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = url;
    link.download = `${paper.name.replace(/[^a-z0-9-_ ]/gi, "").trim() || "question-paper"}-answer-key.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto grid max-w-[1500px] gap-6 p-4 lg:grid-cols-[320px_1fr] lg:p-8">
        <aside className="panel h-fit p-6 lg:sticky lg:top-8">
          <div className="eyebrow">Exam Studio</div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">Question Paper Generator</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">Build clean, balanced papers from your Excel question bank.</p>

          <label className="mt-8 block text-sm font-bold">Import Excel question bank</label>
          <label className="mt-2 flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-indigo-300 bg-indigo-50 px-4 py-4 text-center text-sm font-semibold text-indigo-700">
            <span>Choose .xlsx file</span>
            <input className="hidden" type="file" accept=".xlsx" onChange={(event) => upload(event.target.files?.[0])} />
          </label>
          <p className="mt-2 text-xs text-slate-400">Imported workbooks are used for this browser session.</p>

          <div className="mt-8 border-t border-slate-100 pt-6">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">Paper summary</h2>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold">{blueprintMarks} marks</span>
            </div>
            <p className="mt-3 text-sm text-slate-500">{subject || "No subject selected"}</p>
            <p className="mt-1 text-sm text-slate-500">{selectedChapters.length} chapters selected</p>
          </div>
        </aside>

        <section className="min-w-0">
          <header className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <div className="eyebrow">Paper builder</div>
              <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Generate a formatted exam paper</h2>
            </div>
            <div className="rounded-xl bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
              <span className="font-bold text-slate-800">{questions ? "Uploaded bank" : "Starter bank"}</span>
            </div>
          </header>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
            <div className="space-y-6">
              <section className="panel grid gap-4 p-5 md:grid-cols-3">
                <label className="text-sm font-bold">Paper name<input className="field mt-2" value={paperName} onChange={(event) => setPaperName(event.target.value)} /></label>
                <label className="text-sm font-bold">Subject<select className="field mt-2" value={subject} onChange={(event) => changeSubject(event.target.value)}>{subjects.map((value) => <option key={value}>{value}</option>)}</select></label>
                <label className="text-sm font-bold">Maximum marks<input className="field mt-2" type="number" min={1} value={totalMarks} onChange={(event) => changeTotalMarks(Number(event.target.value))} /></label>
              </section>

              <section className="panel p-5">
                <div className="flex items-center justify-between gap-4">
                  <div><h3 className="text-lg font-bold">Chapter / module selection</h3><p className="mt-1 text-sm text-slate-500">Choose the content to include.</p></div>
                  <button className="btn btn-secondary text-sm" onClick={() => setSelectedChapters(selectedChapters.length === chapters.length ? [] : chapters)}>{selectedChapters.length === chapters.length ? "Clear all" : "Select all"}</button>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {chapters.map((chapter) => <label key={chapter} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-100 p-3 text-sm hover:bg-slate-50"><input type="checkbox" checked={selectedChapters.includes(chapter)} onChange={() => toggleChapter(chapter)} /><span>{chapter}<small className="ml-1 text-slate-400">({chapterCounts[chapter] || 0})</small></span></label>)}
                </div>
              </section>

              <section className="panel p-5">
                <div className="flex items-center justify-between gap-4">
                  <div><h3 className="text-lg font-bold">Topic filter <span className="font-normal text-slate-400">(optional)</span></h3></div>
                  <button className="btn btn-secondary text-sm" onClick={() => setSelectedTopics(selectedTopics.length === topics.length ? [] : topics)}>{selectedTopics.length === topics.length ? "Clear all" : "Select all"}</button>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {topics.length ? topics.map((topic) => <label key={topic} className={`cursor-pointer rounded-full border px-3 py-2 text-sm ${selectedTopics.includes(topic) ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600"}`}><input className="mr-2" type="checkbox" checked={selectedTopics.includes(topic)} onChange={() => setSelectedTopics(selectedTopics.includes(topic) ? selectedTopics.filter((value) => value !== topic) : [...selectedTopics, topic])} />{topic} ({topicCounts[topic] || 0})</label>) : <p className="text-sm text-slate-400">Select chapters to see available topics.</p>}
                </div>
              </section>

              <section className="panel p-5">
                <div className="flex items-center justify-between gap-4"><div><h3 className="text-lg font-bold">CBSE blueprint <span className="font-normal text-slate-400">(editable)</span></h3><p className="mt-1 text-sm text-slate-500">Starts with the CBSE Grade 10 five-section pattern. Editing a section updates the maximum marks.</p></div><button className="btn btn-secondary text-sm" onClick={() => replaceSections([...sections, { id: crypto.randomUUID(), name: `Section ${String.fromCharCode(65 + sections.length)}`, questionType: "Short Answer", questionCount: 1, marksPerQuestion: 3 }])}>Add section</button></div>
                <div className="mt-4 space-y-3">
                  {sections.map((section) => <div key={section.id} className="grid gap-2 rounded-xl bg-slate-50 p-3 md:grid-cols-[1.2fr_1.2fr_100px_100px_auto] md:items-end">
                    <label className="text-xs font-bold text-slate-500">Section<input className="field mt-1 bg-white text-sm" value={section.name} onChange={(event) => updateSection(section.id, { name: event.target.value })} /></label>
                    <label className="text-xs font-bold text-slate-500">Question type<select className="field mt-1 bg-white text-sm" value={section.questionType} onChange={(event) => updateSection(section.id, { questionType: event.target.value })}>{questionTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
                    <label className="text-xs font-bold text-slate-500">Count<input className="field mt-1 bg-white text-sm" type="number" min={0} value={section.questionCount} onChange={(event) => updateSection(section.id, { questionCount: Number(event.target.value) })} /></label>
                    <label className="text-xs font-bold text-slate-500">Marks<input className="field mt-1 bg-white text-sm" type="number" min={1} value={section.marksPerQuestion} onChange={(event) => updateSection(section.id, { marksPerQuestion: Number(event.target.value) })} /></label>
                    <button className="rounded-lg px-2 py-2 text-sm font-bold text-rose-600 hover:bg-rose-50" onClick={() => replaceSections(sections.filter((value) => value.id !== section.id))}>Remove</button>
                  </div>)}
                </div>
                <div className={`mt-4 text-right text-sm font-bold ${blueprintMarks === totalMarks ? "text-emerald-600" : "text-rose-600"}`}>Blueprint total: {blueprintMarks} / {totalMarks}</div>
              </section>

              <div className="flex flex-wrap items-center gap-3">
                <button className="btn btn-primary" disabled={loading} onClick={generate}>{loading ? "Generating..." : "Generate paper"}</button>
                {paper && <button className="btn btn-dark" onClick={downloadPdf}>Download PDF</button>}
                {paper && <button className="btn btn-secondary" onClick={downloadAnswerKey}>Download answer key</button>}
                {message && <p className="text-sm font-semibold text-slate-600">{message}</p>}
              </div>
            </div>

            <aside className="panel h-fit overflow-hidden xl:sticky xl:top-8">
              <div className="border-b border-slate-100 bg-slate-50 p-5"><div className="eyebrow">Live preview</div><h3 className="mt-2 text-xl font-bold">{paper?.name || paperName}</h3><p className="mt-1 text-sm text-slate-500">{subject || "Select a subject"} · {paper?.totalMarks || totalMarks} marks</p></div>
              <div className="max-h-[70vh] overflow-y-auto p-5">
                {paper ? previewSections.map(({ section, questions: sectionQuestions }) => <div key={section.id} className="mb-5 last:mb-0"><h4 className="border-b border-indigo-100 pb-2 text-sm font-bold text-indigo-700">{section.name}</h4>{sectionQuestions.map((question, index) => <article key={`${question.id}-${index}`} className="border-b border-slate-100 py-4 last:border-0"><div className="flex justify-between gap-3 text-xs font-bold text-indigo-600"><span>Q{paper.questions.indexOf(question) + 1}</span><span>{question.marks} marks</span></div><p className="mt-2 text-sm leading-6">{question.text}</p>{question.options.filter(Boolean).length > 0 && <ol className="mt-2 space-y-1 text-sm text-slate-500">{question.options.filter(Boolean).map((option, optionIndex) => <li key={option}><span className="mr-2 font-bold">{String.fromCharCode(65 + optionIndex)}.</span>{option}</li>)}</ol>}</article>)}</div>) : <div className="py-12 text-center text-sm leading-6 text-slate-400">Your generated questions will appear here. Adjust the blueprint and select Generate paper.</div>}
              </div>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
