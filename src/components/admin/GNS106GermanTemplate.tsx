import { Button } from "@/components/ui/button";
import { FileSpreadsheet, FileText, Languages } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

/**
 * Generates the GNS 106 German starter bank on-demand (Excel or CSV) so
 * admins can grab a ready-to-edit template right from the upload page.
 * Identical schema to the universal tutor template — same 60 seed Qs.
 */

const QT = "GNS 106 — German & Objectives (Practice)";
const ROWS: Array<Record<string, string | number>> = [
  // EASY — 24
  row("What does 'Guten Morgen' mean?","Good night","Good morning","Good evening","Goodbye","B","Guten Morgen = Good morning.","easy","Greetings"),
  row("What does 'Guten Tag' mean?","Good day","Good night","Hello friend","See you","A","Guten Tag = Good day / Hello (formal).","easy","Greetings"),
  row("What does 'Guten Abend' mean?","Good morning","Good afternoon","Good evening","Good night","C","Guten Abend = Good evening.","easy","Greetings"),
  row("What does 'Gute Nacht' mean?","Good night","Good day","Goodbye","Hello","A","Gute Nacht = Good night.","easy","Greetings"),
  row("What does 'Auf Wiedersehen' mean?","Hello","Please","Goodbye","Thank you","C","Auf Wiedersehen = Goodbye (formal).","easy","Greetings"),
  row("What does 'Tschüss' mean?","Hello","Bye (informal)","Please","Sorry","B","Tschüss = informal goodbye.","easy","Greetings"),
  row("What does 'Danke' mean?","Please","Sorry","Thank you","Yes","C","Danke = Thank you.","easy","Vocabulary"),
  row("What does 'Bitte' mean?","Please / You're welcome","Sorry","Hello","No","A","Bitte = please OR you're welcome.","easy","Vocabulary"),
  row("What does 'Ja' mean?","No","Maybe","Yes","Never","C","Ja = Yes.","easy","Vocabulary"),
  row("What does 'Nein' mean?","Yes","No","Maybe","Now","B","Nein = No.","easy","Vocabulary"),
  row("How do you say 'My name is...' in German?","Ich heiße...","Du bist...","Wir sind...","Sie haben...","A","Ich heiße... = My name is...","easy","Greetings"),
  row("'Wie geht's?' means:","What's your name?","How old are you?","How are you?","Where are you?","C","Wie geht's? = How are you? (informal).","easy","Greetings"),
  row("German for 'one' is:","zwei","drei","eins","vier","C","eins = 1.","easy","Numbers & Time"),
  row("German for 'two' is:","zwei","drei","vier","fünf","A","zwei = 2.","easy","Numbers & Time"),
  row("German for 'three' is:","eins","drei","sechs","neun","B","drei = 3.","easy","Numbers & Time"),
  row("German for 'ten' is:","zehn","zwanzig","elf","sieben","A","zehn = 10.","easy","Numbers & Time"),
  row("'Wasser' means:","Bread","Water","Wine","Milk","B","Wasser = water.","easy","Vocabulary"),
  row("'Brot' means:","Bread","Butter","Beer","Book","A","Brot = bread.","easy","Vocabulary"),
  row("'Buch' means:","Bag","Bed","Book","Boy","C","Buch = book.","easy","Vocabulary"),
  row("'Haus' means:","Hand","House","Hat","Hair","B","Haus = house.","easy","Vocabulary"),
  row("'Auto' means:","Animal","Office","Car","August","C","Auto = car.","easy","Vocabulary"),
  row("'Schule' means:","Shoe","School","Sugar","Shower","B","Schule = school.","easy","Vocabulary"),
  row("'Lehrer' means:","Learner","Letter","Teacher (m)","Leader","C","Lehrer = (male) teacher.","easy","Vocabulary"),
  row("'Student' means:","Student","Stadium","Story","Stone","A","Student = student.","easy","Vocabulary"),
  // MEDIUM — 24
  row("Choose the correct article: ___ Mann","die","das","der","den","C","Mann is masculine → der Mann.","medium","Articles (der/die/das)"),
  row("Choose the correct article: ___ Frau","der","die","das","den","B","Frau is feminine → die Frau.","medium","Articles (der/die/das)"),
  row("Choose the correct article: ___ Kind","der","die","das","dem","C","Kind is neuter → das Kind.","medium","Articles (der/die/das)"),
  row("Choose the correct article: ___ Buch","der","die","das","den","C","Buch is neuter → das Buch.","medium","Articles (der/die/das)"),
  row("Choose the correct article: ___ Universität","der","die","das","den","B","Universität is feminine → die Universität.","medium","Articles (der/die/das)"),
  row("Conjugate 'sein' for 'ich': Ich ___ Student.","bist","bin","ist","sind","B","ich bin (I am).","medium","Verbs — sein/haben"),
  row("Conjugate 'sein' for 'du': Du ___ nett.","bin","ist","bist","seid","C","du bist (you are).","medium","Verbs — sein/haben"),
  row("Conjugate 'sein' for 'wir': Wir ___ in Akure.","sind","seid","ist","bin","A","wir sind (we are).","medium","Verbs — sein/haben"),
  row("Conjugate 'haben' for 'ich': Ich ___ ein Buch.","hast","hat","habe","haben","C","ich habe (I have).","medium","Verbs — sein/haben"),
  row("Conjugate 'haben' for 'er': Er ___ Hunger.","habe","hast","hat","haben","C","er hat (he has).","medium","Verbs — sein/haben"),
  row("Plural of 'das Buch' is:","die Buchs","die Bücher","die Buchen","das Büchern","B","Plural: die Bücher.","medium","Vocabulary"),
  row("Plural of 'der Mann' is:","die Manns","die Männer","die Männen","der Männer","B","Plural: die Männer.","medium","Vocabulary"),
  row("'Ich komme aus Nigeria' means:","I go to Nigeria","I come from Nigeria","I live in Nigeria","I love Nigeria","B","kommen aus = come from.","medium","Vocabulary"),
  row("'Wo wohnst du?' means:","Where do you live?","Who are you?","What do you do?","When do you sleep?","A","wohnen = to live/reside.","medium","Vocabulary"),
  row("Correct order: 'Ich / heute / gehe / zur Schule'","Ich heute gehe zur Schule","Heute ich gehe zur Schule","Ich gehe heute zur Schule","Gehe ich heute zur Schule","C","Verb in 2nd position.","medium","Word Order"),
  row("Negation: 'Ich habe ___ Geld.' (no money)","nicht","kein","nein","nichts","B","kein negates nouns.","medium","Negation"),
  row("'Wie spät ist es?' means:","How late is it?","What time is it?","How fast is it?","How long is it?","B","Idiomatic: What time is it?","medium","Numbers & Time"),
  row("'Es ist halb acht' means:","8:30","7:30","8:15","7:45","B","halb acht = 7:30.","medium","Numbers & Time"),
  row("Choose: Ich trinke ___ Kaffee.","ein","einen","eine","einem","B","Kaffee = masc., accusative.","medium","Articles (der/die/das)"),
  row("Choose: Er liest ___ Buch.","ein","einen","eine","einem","A","Buch = neuter, accusative.","medium","Articles (der/die/das)"),
  row("Choose: Sie kauft ___ Tasche.","ein","einen","eine","einer","C","Tasche = fem., accusative.","medium","Articles (der/die/das)"),
  row("'Möchten' is the polite form of:","müssen","mögen","machen","kommen","B","möchten from mögen.","medium","Modal Verbs"),
  row("'Ich möchte ein Glas Wasser' means:","I drink water","I want water now","I'd like a glass of water","I have water","C","möchte = would like.","medium","Modal Verbs"),
  row("Question word for 'why' is:","wer","was","wo","warum","D","warum = why.","medium","Vocabulary"),
  // HARD — 12
  row("Dative: Ich gebe ___ Mann das Buch.","der","den","dem","des","C","Dative masc.: dem Mann.","hard","Cases — Dative & Genitive"),
  row("Dative: Ich helfe ___ Frau.","die","der","den","dem","B","helfen takes dative; fem. = der Frau.","hard","Cases — Dative & Genitive"),
  row("Genitive: das Auto ___ Lehrers.","der","die","des","dem","C","Genitive masc.: des Lehrers.","hard","Cases — Dative & Genitive"),
  row("Perfekt of 'gehen': Ich ___ nach Hause ___.","habe / gegangen","bin / gegangen","bin / gegangt","habe / gegangen sein","B","Movement verbs use 'sein'.","hard","Perfekt"),
  row("Perfekt of 'machen': Ich ___ die Aufgabe ___.","bin / gemacht","habe / gemacht","habe / gemachen","bin / gemachen","B","machen → habe gemacht.","hard","Perfekt"),
  row("Modal: 'Ich ___ Deutsch sprechen.' (am able to)","muss","soll","kann","darf","C","kann = can.","hard","Modal Verbs"),
  row("Modal: 'Du ___ nicht rauchen.' (not allowed)","kannst","musst","darfst","willst","C","du darfst nicht.","hard","Modal Verbs"),
  row("Subordinate clause: 'Ich weiß, dass er krank ___.'","ist","sein","war sein","bist","A","Verb at end in dass-clause.","hard","Word Order"),
  row("Reflexive: 'Ich wasche ___.' (myself)","mir","mich","sich","dich","B","Accusative reflexive = mich.","hard","Pronouns"),
  row("Comparative of 'gut' is:","guter","guten","besser","gutester","C","gut → besser.","hard","Vocabulary"),
  row("Superlative of 'viel' is:","vieler","mehr","am meisten","viele","C","viel → mehr → am meisten.","hard","Vocabulary"),
  row("Passive: 'Das Buch ___ von dem Studenten gelesen.'","ist","hat","wird","war gehabt","C","Present passive uses werden.","hard","Passive Voice"),

  // ===== OBJECTIVES (Use of English / Communication) — 20 =====
  row("The main purpose of communication is to:","entertain people","exchange information and ideas","fill silence","show off vocabulary","B","Communication = exchange of info, ideas, feelings.","easy","Objectives — Communication"),
  row("Which is NOT a barrier to communication?","Noise","Language difference","Active listening","Cultural bias","C","Active listening removes barriers, not creates them.","easy","Objectives — Communication"),
  row("Non-verbal communication includes all EXCEPT:","gestures","facial expression","tone of writing","posture","C","Tone of writing is verbal/written, not non-verbal.","easy","Objectives — Communication"),
  row("The sender of a message is also called the:","decoder","encoder","receiver","medium","B","Sender encodes the message.","easy","Objectives — Communication"),
  row("Feedback in communication means:","repeating the message","the receiver's response","the channel used","background noise","B","Feedback = receiver's response to sender.","easy","Objectives — Communication"),
  row("Choose the correct sentence:","He don't like reading","He doesn't likes reading","He doesn't like reading","He not like reading","C","Third person singular: doesn't + base verb.","easy","Objectives — Grammar"),
  row("Identify the noun: 'The children played happily in the park.'","played","happily","children","in","C","'Children' is a (plural) noun.","easy","Objectives — Grammar"),
  row("Antonym of 'generous' is:","kind","stingy","helpful","wealthy","B","Generous ↔ stingy.","easy","Objectives — Vocabulary"),
  row("Synonym of 'commence' is:","end","begin","pause","cancel","B","Commence = begin.","easy","Objectives — Vocabulary"),
  row("A formal letter usually begins with:","Hi","Dear Sir/Madam","Hey there","Yo","B","Formal salutation.","easy","Objectives — Writing"),
  row("Which is a primary source of information?","Textbook summary","Newspaper review","Original research paper","Wikipedia article","C","Primary = original/first-hand.","medium","Objectives — Study Skills"),
  row("The skill of reading quickly to get the general idea is:","scanning","skimming","intensive reading","SQ3R","B","Skimming = general overview.","medium","Objectives — Study Skills"),
  row("Scanning is used to:","get main idea","locate specific information","memorize text","summarize","B","Scanning = locating specific facts.","medium","Objectives — Study Skills"),
  row("Choose the correctly punctuated sentence:","\"Where are you going,\" she asked.","Where are you going she asked.","\"Where are you going\" she asked","Where are you going? she asked","A","Direct speech ends with question mark inside quotes; comma before 'she asked' acceptable in some styles — here the closed quote version is best.","medium","Objectives — Grammar"),
  row("The figure of speech in 'Time is money' is:","simile","metaphor","personification","hyperbole","B","Direct comparison without 'like/as' = metaphor.","medium","Objectives — Literature"),
  row("'She runs like the wind' is an example of:","metaphor","simile","irony","alliteration","B","Uses 'like' = simile.","medium","Objectives — Literature"),
  row("A bibliography is:","a short biography","a list of sources used","a chapter summary","an index","B","Bibliography = list of references/sources.","medium","Objectives — Study Skills"),
  row("Plagiarism means:","quoting with credit","using others' work as your own","writing in groups","citing sources","B","Plagiarism = passing others' work as yours.","medium","Objectives — Ethics"),
  row("Which is an example of effective listening?","Interrupting the speaker","Thinking of your reply","Asking clarifying questions","Checking your phone","C","Clarifying questions = active listening.","easy","Objectives — Communication"),
  row("The official language of communication in Nigerian universities is:","French","German","English","Pidgin","C","English is the medium of instruction.","easy","Objectives — Communication"),
];

function row(q: string, a: string, b: string, c: string, d: string, correct: string, exp: string, diff: string, topic: string) {
  return {
    quiz_title: QT,
    course_code: "GNS 106",
    course_name: "Use of English / Communication in French/German",
    question_text: q,
    option_a: a, option_b: b, option_c: c, option_d: d,
    correct_option: correct,
    explanation: exp,
    difficulty: diff,
    topic,
    duration_minutes: 30,
  };
}

const HEADERS = [
  "quiz_title","course_code","course_name","question_text",
  "option_a","option_b","option_c","option_d",
  "correct_option","explanation","difficulty","topic","duration_minutes",
];

function downloadXlsx() {
  const ws = XLSX.utils.json_to_sheet(ROWS, { header: HEADERS });
  ws["!cols"] = [
    { wch: 28 }, { wch: 12 }, { wch: 40 }, { wch: 60 },
    { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 22 },
    { wch: 14 }, { wch: 50 }, { wch: 12 }, { wch: 26 }, { wch: 16 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Questions");
  XLSX.writeFile(wb, "GNS106_German_and_Objectives_Starter.xlsx");
  toast.success("GNS 106 starter Excel downloaded (German + Objectives, 80 questions)");
}

function downloadCsv() {
  const esc = (v: any) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    HEADERS.join(","),
    ...ROWS.map((r) => HEADERS.map((h) => esc((r as any)[h])).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "GNS106_German_Starter.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast.success("GNS 106 starter CSV downloaded (60 questions)");
}

export function GNS106GermanTemplate() {
  return (
    <div className="rounded-xl border border-rose-200/60 bg-gradient-to-br from-rose-50 via-amber-50/60 to-white p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-rose-600 text-white shadow">
          <Languages className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-rose-700">
            Tomorrow's paper
          </p>
          <h3 className="font-semibold text-base">GNS 106 — German starter bank</h3>
          <p className="text-xs text-muted-foreground">
            60 seed questions across greetings, articles, verbs, numbers, Perfekt &amp; passive — auto-tagged by topic. Edit, replace with real past questions, then upload.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 pl-1">
        <Button size="sm" variant="outline" className="border-rose-300 text-rose-800 hover:bg-rose-50" onClick={downloadXlsx}>
          <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" /> Download Excel
        </Button>
        <Button size="sm" variant="outline" className="border-rose-300 text-rose-800 hover:bg-rose-50" onClick={downloadCsv}>
          <FileText className="w-3.5 h-3.5 mr-1.5" /> Download CSV
        </Button>
      </div>
    </div>
  );
}

export default GNS106GermanTemplate;
