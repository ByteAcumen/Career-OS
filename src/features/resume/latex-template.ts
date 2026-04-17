/**
 * Jake's Resume LaTeX Template (MIT License)
 * Original: github.com/sb2nov/resume
 * Used as the canonical structure for Career OS resume exports.
 * Fill in the placeholders with actual user data.
 */

export const JAKE_LATEX_TEMPLATE = `
%-------------------------
% Resume in Latex
% Based on Jake's Resume Template (github.com/sb2nov/resume)
% License: MIT
%------------------------

\\documentclass[letterpaper,11pt]{article}

\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage[english]{babel}
\\usepackage{tabularx}
\\input{glyphtounicode}

\\pagestyle{fancy}
\\fancyhf{}
\\fancyfoot{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

\\addtolength{\\oddsidemargin}{-0.5in}
\\addtolength{\\evensidemargin}{-0.5in}
\\addtolength{\\textwidth}{1in}
\\addtolength{\\topmargin}{-.5in}
\\addtolength{\\textheight}{1.0in}

\\urlstyle{same}
\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}

\\titleformat{\\section}{
  \\vspace{-4pt}\\scshape\\raggedright\\large
}{}{0em}{}[\\color{black}\\titlerule \\vspace{-5pt}]

\\pdfgentounicode=1

%--- Custom commands ---
\\newcommand{\\resumeItem}[1]{
  \\item\\small{{#1 \\vspace{-2pt}}}
}

\\newcommand{\\resumeSubheading}[4]{
  \\vspace{-2pt}\\item
    \\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\textbf{#1} & #2 \\\\
      \\textit{\\small#3} & \\textit{\\small #4} \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeProjectHeading}[2]{
    \\item
    \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}
      \\small#1 & #2 \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeSubItem}[1]{\\resumeItem{#1}\\vspace{-4pt}}

\\renewcommand\\labelitemii{$\\vcenter{\\hbox{\\tiny$\\bullet$}}$}

\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.15in, label={}]}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-5pt}}

%-------------------------------------------
\\begin{document}

%--- HEADING ---
\\begin{center}
    {\\Huge \\scshape {{NAME}}} \\\\ \\vspace{1pt}
    \\small {{EMAIL}} $|$
    \\href{{{LINKEDIN}}}{\\underline{LinkedIn}} $|$
    \\href{{{GITHUB}}}{\\underline{GitHub}} $|$
    \\href{{{PORTFOLIO}}}{\\underline{Portfolio}}
\\end{center}

%--- EDUCATION ---
\\section{Education}
  \\resumeSubHeadingListStart
    \\resumeSubheading
      {{{UNIVERSITY}}}{{{LOCATION}}}
      {{{DEGREE}}}{{{GRAD_YEAR}}}
  \\resumeSubHeadingListEnd

%--- EXPERIENCE ---
{{EXPERIENCE_SECTION}}

%--- PROJECTS ---
\\section{Projects}
  \\resumeSubHeadingListStart
{{PROJECTS_SECTION}}
  \\resumeSubHeadingListEnd

%--- TECHNICAL SKILLS ---
\\section{Technical Skills}
 \\begin{itemize}[leftmargin=0.15in, label={}]
    \\small{\\item{
     \\textbf{Languages}{: {{LANGUAGES}}} \\\\
     \\textbf{Frameworks}{: {{FRAMEWORKS}}} \\\\
     \\textbf{Tools}{: {{TOOLS}}}
    }}
 \\end{itemize}

\\end{document}
`.trim();

/**
 * Fill the Jake's template with resume data.
 * All values are LaTeX-escaped before insertion.
 */
export function fillJakeTemplate(data: {
  name: string;
  email: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  university?: string;
  location?: string;
  degree?: string;
  gradYear?: string;
  experienceLatex?: string;
  projectsLatex?: string;
  languages?: string;
  frameworks?: string;
  tools?: string;
}): string {
  const e = latexEscape;
  return JAKE_LATEX_TEMPLATE
    .replace("{{NAME}}", e(data.name))
    .replace("{{EMAIL}}", e(data.email))
    .replace("{{LINKEDIN}}", data.linkedin ?? "#")
    .replace("{{GITHUB}}", data.github ?? "#")
    .replace("{{PORTFOLIO}}", data.portfolio ?? "#")
    .replace("{{UNIVERSITY}}", e(data.university ?? "University"))
    .replace("{{LOCATION}}", e(data.location ?? ""))
    .replace("{{DEGREE}}", e(data.degree ?? "B.Tech Computer Science"))
    .replace("{{GRAD_YEAR}}", e(data.gradYear ?? "2025"))
    .replace("{{EXPERIENCE_SECTION}}", data.experienceLatex ?? "")
    .replace("{{PROJECTS_SECTION}}", data.projectsLatex ?? "")
    .replace("{{LANGUAGES}}", e(data.languages ?? "TypeScript, Python, Java, C++"))
    .replace("{{FRAMEWORKS}}", e(data.frameworks ?? "React, Next.js, Node.js"))
    .replace("{{TOOLS}}", e(data.tools ?? "Git, Docker, AWS, Linux"));
}

export function latexEscape(value: string): string {
  return value
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/&/g, "\\&")
    .replace(/%/g, "\\%")
    .replace(/\$/g, "\\$")
    .replace(/#/g, "\\#")
    .replace(/_/g, "\\_")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}
