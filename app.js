/**
 * MHT-CET Score Calculator - Main Application Logic
 * Implements MHTML client-side parsing, dashboard rendering, SVG charts, 
 * search & filters, copy utilities, and theme toggling.
 */

document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. CORE APPLICATION STATE ---
    let appState = {
        questions: [],
        stats: {
            totalQuestions: 0,
            attempted: 0,
            correct: 0,
            incorrect: 0,
            unattempted: 0,
            totalMarks: 0,
            marksObtained: 0,
            accuracy: 0,
            sections: {}
        },
        candidate: {
            name: "Candidate Response Sheet",
            rollNumber: "N/A",
            examDate: "N/A"
        },
        filters: {
            subject: "all",
            status: "all",
            search: ""
        },
        expandedQuestions: new Set(),
        currentTheme: "dark"
    };

    // --- 2. DOM ELEMENT SELECTORS ---
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const browseBtn = document.getElementById('browse-btn');
    const demoBtn = document.getElementById('demo-btn');
    const resetBtn = document.getElementById('reset-btn');
    const themeToggle = document.getElementById('theme-toggle');
    const printBtn = document.getElementById('print-btn');
    
    const uploadSection = document.getElementById('upload-section');
    const dashboardSection = document.getElementById('dashboard-section');
    
    // Candidate Info selectors
    const candNameEl = document.getElementById('cand-name');
    const candRollEl = document.getElementById('cand-roll');
    const candDateEl = document.getElementById('cand-date');
    
    // Score Dashboard selectors
    const overallScoreEl = document.getElementById('overall-score');
    const gaugePercentEl = document.getElementById('gauge-percent');
    const scoreRing = document.getElementById('score-ring');
    
    // Stats overview selectors
    const statTotalEl = document.getElementById('stat-total');
    const statAttemptedEl = document.getElementById('stat-attempted');
    const statCorrectEl = document.getElementById('stat-correct');
    const statWrongEl = document.getElementById('stat-wrong');
    const statUnattemptedEl = document.getElementById('stat-unattempted');
    const statAccuracyEl = document.getElementById('stat-accuracy');
    
    // Table/Filters selectors
    const searchInput = document.getElementById('search-input');
    const subjectFiltersGroup = document.getElementById('subject-filters');
    const statusFiltersGroup = document.getElementById('status-filters');
    const filteredCountEl = document.getElementById('filtered-count');
    const totalCountEl = document.getElementById('total-count');
    const tableBody = document.getElementById('table-body');

    // --- 3. THEME TOGGLING ---
    themeToggle.addEventListener('click', () => {
        const htmlEl = document.documentElement;
        const currentTheme = htmlEl.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        htmlEl.setAttribute('data-theme', newTheme);
        appState.currentTheme = newTheme;
        localStorage.setItem('mhtcet_analyzer_theme', newTheme);
        
        // Update button icon
        const icon = themeToggle.querySelector('i');
        if (newTheme === 'light') {
            icon.className = 'fa-solid fa-sun';
        } else {
            icon.className = 'fa-solid fa-moon';
        }
        
        // Redraw SVG charts to adapt text colors if loaded
        if (appState.questions.length > 0) {
            renderCharts();
        }
    });

    // --- 4. FILE UPLOAD & DROP HANDLERS ---
    
    // Click browse triggers hidden input
    browseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
    });

    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleFile(file);
    });

    // Drag and drop visual effects
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('active');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('active');
        }, false);
    });

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const file = dt.files[0];
        if (file) handleFile(file);
    });

    // Load Demo Mode
    demoBtn.addEventListener('click', () => {
        if (window.MHTCET_DEMO) {
            const demoMhtml = window.MHTCET_DEMO.getDemoMhtml();
            processMhtmlContent(demoMhtml);
            
            // Push notification & toast
            showToast("Demo Scorecard Loaded Successfully!", "success");
        } else {
            showToast("Demo module not found.", "error");
        }
    });

    // Reset Application State
    resetBtn.addEventListener('click', () => {
        // Reset state
        appState.questions = [];
        appState.expandedQuestions.clear();
        appState.stats = {
            totalQuestions: 0,
            attempted: 0,
            correct: 0,
            incorrect: 0,
            unattempted: 0,
            totalMarks: 0,
            marksObtained: 0,
            accuracy: 0,
            sections: {}
        };
        appState.candidate = {
            name: "Candidate Response Sheet",
            rollNumber: "N/A",
            examDate: "N/A"
        };
        
        // Clear local storage state
        localStorage.removeItem('mhtcet_analyzer_state');
        
        // Reset inputs
        fileInput.value = "";
        searchInput.value = "";
        
        // Reset active filter pills
        document.querySelectorAll('.pill').forEach(pill => pill.classList.remove('active'));
        document.querySelector('[data-subject="all"]').classList.add('active');
        document.querySelector('[data-status="all"]').classList.add('active');
        appState.filters.subject = "all";
        appState.filters.status = "all";
        appState.filters.search = "";
        
        // Animate screen change
        dashboardSection.classList.add('hidden');
        resetBtn.classList.add('hidden');
        uploadSection.classList.remove('hidden');
        uploadSection.classList.add('fade-in');
        
        showToast("Application Reset Completed", "info");
    });

    // Print Action
    printBtn.addEventListener('click', () => {
        window.print();
    });

    // --- 5. CORE PARSING ENGINE ---
    
    function handleFile(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const content = e.target.result;
            processMhtmlContent(content);
        };
        reader.onerror = function() {
            showToast("Error reading response sheet file.", "error");
        };
        reader.readAsText(file, "UTF-8");
    }

    function processMhtmlContent(content) {
        try {
            // Replicate check_score.py: strip MHTML boundary if present
            let htmlContent = content;
            const htmlStart = content.indexOf("<!DOCTYPE html>");
            if (htmlStart !== -1) {
                htmlContent = content.substring(htmlStart);
            }

            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlContent, 'text/html');
            
            // 1. Scrape Candidate Information (Names, Roll Number, Exam Date)
            extractCandidateInfo(doc, htmlContent);

            // 2. Query Question Rows matching tblObjection > tbody > tr
            const rows = doc.querySelectorAll('#tblObjection > tbody > tr');
            if (rows.length === 0) {
                // Try an alternate query selector in case structure slightly differs
                const altRows = doc.querySelectorAll('table tr');
                if (altRows.length < 50) {
                    throw new Error("Unable to locate MHTCET objection table rows. Please check if file is valid.");
                }
            }

            // Reset scores & categories
            appState.questions = [];
            appState.stats = {
                totalQuestions: 0,
                attempted: 0,
                correct: 0,
                incorrect: 0,
                unattempted: 0,
                totalMarks: 0,
                marksObtained: 0,
                accuracy: 0,
                sections: {}
            };

            rows.forEach((row, idx) => {
                const tds = Array.from(row.children).filter(child => child.tagName === 'TD');
                
                if (tds.length >= 3) {
                    const qIdTd = tds[0];
                    const sectionTd = tds[1];
                    const styleAttr = qIdTd.getAttribute('style') || '';
                    
                    // Match check_score.py check: width:10% in q_id style attribute
                    if (styleAttr.includes('width:10%') || styleAttr.includes('10%')) {
                        const questionId = qIdTd.textContent.trim();
                        let sectionName = sectionTd.textContent.trim();
                        
                        // Clean sectionName (e.g. Physics, Chemistry, Mathematics)
                        if (sectionName.toUpperCase().includes("MATH")) {
                            sectionName = "Mathematics";
                        } else if (sectionName.toUpperCase().includes("PHYSIC")) {
                            sectionName = "Physics";
                        } else if (sectionName.toUpperCase().includes("CHEMIS")) {
                            sectionName = "Chemistry";
                        }
                        
                        // Subject weight rules (Math = 2, Physics/Chemistry = 1)
                        const questionMarks = (sectionName === "Mathematics") ? 2 : 1;

                        if (!appState.stats.sections[sectionName]) {
                            appState.stats.sections[sectionName] = {
                                correct: 0,
                                incorrect: 0,
                                unattempted: 0,
                                total: 0,
                                marks: 0,
                                maxMarks: 0
                            };
                        }

                        appState.stats.sections[sectionName].maxMarks += questionMarks;
                        appState.stats.sections[sectionName].total += 1;

                        // Seek options table
                        const innerTable = row.querySelector('table.center');
                        if (innerTable) {
                            const innerTds = innerTable.querySelectorAll('td');
                            if (innerTds.length >= 2) {
                                // MHTCET marks correct option in column 0, and candidate response in column 1
                                const correctSpan = innerTds[0].querySelector('span');
                                const candidateSpan = innerTds[1].querySelector('span');
                                
                                const correctOption = correctSpan ? correctSpan.textContent.trim() : '';
                                const candidateResponse = candidateSpan ? candidateSpan.textContent.trim() : '';
                                
                                appState.stats.totalQuestions++;
                                appState.stats.totalMarks += questionMarks;
                                
                                let status = "Unattempted";
                                let awardedMarks = 0;

                                // Check if candidate responded (meaning response is a digit)
                                const isAttempted = candidateResponse && /^\d+$/.test(candidateResponse);

                                if (isAttempted) {
                                    appState.stats.attempted++;
                                    if (candidateResponse === correctOption) {
                                        appState.stats.correct++;
                                        appState.stats.sections[sectionName].correct++;
                                        status = "Correct";
                                        awardedMarks = questionMarks;
                                        appState.stats.marksObtained += awardedMarks;
                                        appState.stats.sections[sectionName].marks += awardedMarks;
                                    } else {
                                        appState.stats.incorrect++;
                                        appState.stats.sections[sectionName].incorrect++;
                                        status = "Incorrect";
                                    }
                                } else {
                                    appState.stats.unattempted++;
                                    appState.stats.sections[sectionName].unattempted++;
                                    status = "Unattempted";
                                }

                                appState.questions.push({
                                    id: questionId,
                                    index: appState.questions.length + 1,
                                    subject: sectionName,
                                    correctOption,
                                    candidateResponse,
                                    status,
                                    marks: awardedMarks,
                                    maxMarks: questionMarks
                                });
                            }
                        }
                    }
                }
            });

            if (appState.questions.length === 0) {
                throw new Error("No MHTCET question rows found in the sheet. Please make sure it is a valid Response Key.");
            }

            // Global stats calculation
            appState.stats.accuracy = appState.stats.attempted > 0 
                ? Math.round((appState.stats.correct / appState.stats.attempted) * 100) 
                : 0;

            // Render view
            renderDashboard();
            saveStateToLocalStorage();
            showToast("Answer Key Parsed Successfully!", "success");

        } catch (error) {
            console.error(error);
            showToast("Failed to parse sheet: " + error.message, "error");
        }
    }

    function extractCandidateInfo(doc, textContent) {
        // Fallback defaults
        appState.candidate = {
            name: "MHT-CET Aspirant",
            rollNumber: "N/A",
            examDate: "N/A"
        };

        // Create a clone of doc and remove scripts/styles to avoid matching code
        const cleanDoc = doc.cloneNode(true);
        cleanDoc.querySelectorAll('script, style, textarea, input').forEach(el => el.remove());
        const cleanText = cleanDoc.body ? cleanDoc.body.textContent : cleanDoc.documentElement.textContent;

        // Helper to validate that a string is a valid name/value (no JS code signatures)
        const isValidValue = (val) => {
            if (!val) return false;
            const cleaned = val.trim();
            // Value should be long enough and should not contain typical JS signatures
            return cleaned.length > 2 && !/[()${}=;<>\[\]]/g.test(cleaned) && !cleaned.includes('$(');
        };

        // 1. Search text contents for Name
        const nameRegex = /(?:Candidate\s+Name|Candidate's\s+Name|Name)\s*:\s*([^\n|]+)/i;
        const nameMatch = cleanText.match(nameRegex);
        if (nameMatch) {
            const nameVal = nameMatch[1].trim();
            if (isValidValue(nameVal)) {
                appState.candidate.name = nameVal;
            }
        }

        // 2. Search for Roll Number / Application ID
        const rollRegex = /(?:Roll\s+Number|RollNo|Application\s+No|Candidate\s+ID)\s*:\s*([a-zA-Z0-9]+)/i;
        const rollMatch = cleanText.match(rollRegex);
        if (rollMatch) {
            const rollVal = rollMatch[1].trim();
            if (isValidValue(rollVal)) {
                appState.candidate.rollNumber = rollVal;
            }
        }

        // 3. Search for Date of Exam
        const dateRegex = /(?:Exam\s+Date|Date\s+of\s+Exam|Test\s+Date)\s*:\s*([0-9\/ -]+)/i;
        const dateMatch = cleanText.match(dateRegex);
        if (dateMatch) {
            const dateVal = dateMatch[1].trim();
            if (isValidValue(dateVal)) {
                appState.candidate.examDate = dateVal;
            }
        }

        // 4. Secondary cell-based search in tables
        const allTds = cleanDoc.querySelectorAll('td, th');
        allTds.forEach(td => {
            const text = td.textContent.trim();
            
            // Name search
            if (/Candidate\s*Name/i.test(text)) {
                const nextTd = td.nextElementSibling;
                if (nextTd) {
                    const nameVal = nextTd.textContent.replace(/[:\s]+/g, ' ').trim();
                    if (isValidValue(nameVal)) {
                        appState.candidate.name = nameVal;
                    }
                } else {
                    const match = text.match(/(?:Candidate\s+Name|Candidate's\s+Name)\s*:\s*([^\n|]+)/i);
                    if (match) {
                        const nameVal = match[1].trim();
                        if (isValidValue(nameVal)) {
                            appState.candidate.name = nameVal;
                        }
                    }
                }
            }

            // Roll number search
            if (/Roll\s*Number|Roll\s*No/i.test(text)) {
                const nextTd = td.nextElementSibling;
                if (nextTd) {
                    const rollVal = nextTd.textContent.replace(/[:\s]+/g, ' ').trim();
                    if (isValidValue(rollVal)) {
                        appState.candidate.rollNumber = rollVal;
                    }
                }
            }

            // Exam date search
            if (/Exam\s*Date|Test\s*Date/i.test(text)) {
                const nextTd = td.nextElementSibling;
                if (nextTd) {
                    const dateVal = nextTd.textContent.replace(/[:\s]+/g, ' ').trim();
                    if (isValidValue(dateVal)) {
                        appState.candidate.examDate = dateVal;
                    }
                }
            }
        });
    }

    // --- 6. VIEW RENDERING (DASHBOARD & DETAILS) ---

    function renderDashboard() {
        // Toggle pages
        uploadSection.classList.add('hidden');
        dashboardSection.classList.remove('hidden');
        resetBtn.classList.remove('hidden');

        // 1. Set Candidate Headers
        candNameEl.textContent = appState.candidate.name;
        candRollEl.textContent = appState.candidate.rollNumber;
        candDateEl.textContent = appState.candidate.examDate;

        // 2. Render Score Metrics
        const score = appState.stats.marksObtained;
        const maxScore = appState.stats.totalMarks;
        overallScoreEl.textContent = score;
        
        const scorePercent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
        gaugePercentEl.textContent = `${scorePercent}%`;
        
        // SVG Circular Ring animation
        const radius = scoreRing.r.baseVal.value;
        const circumference = 2 * Math.PI * radius;
        scoreRing.style.strokeDasharray = `${circumference} ${circumference}`;
        const offset = circumference - (scorePercent / 100) * circumference;
        scoreRing.style.strokeDashoffset = offset;

        // Trigger high performance celebration if applicable
        if (score >= 140) {
            triggerHighPerformanceCelebration();
        }

        // 3. Render Subject Cards
        const subjs = ["Physics", "Chemistry", "Mathematics"];
        subjs.forEach(s => {
            const cardPrefix = s === "Physics" ? "phy" : s === "Chemistry" ? "chem" : "math";
            const sData = appState.stats.sections[s] || { correct: 0, incorrect: 0, marks: 0, maxMarks: 0, total: 0 };
            
            // Set Score Badge text
            document.getElementById(`${cardPrefix}-score-badge`).textContent = `${sData.marks} / ${sData.maxMarks}`;
            
            // Set stats details
            document.getElementById(`${cardPrefix}-correct`).textContent = sData.correct;
            document.getElementById(`${cardPrefix}-wrong`).textContent = sData.incorrect;
            
            // Progress Bar filling
            const subPercent = sData.maxMarks > 0 ? (sData.marks / sData.maxMarks) * 100 : 0;
            document.getElementById(`${cardPrefix}-progress`).style.width = `${subPercent}%`;
            
            // Subject Accuracy
            const attempted = sData.correct + sData.incorrect;
            const subAccuracy = attempted > 0 ? Math.round((sData.correct / attempted) * 100) : 0;
            document.getElementById(`${cardPrefix}-accuracy`).textContent = `${subAccuracy}%`;
        });

        // 4. Render Evaluation Analytics
        statTotalEl.textContent = appState.stats.totalQuestions;
        
        const attemptPercent = appState.stats.totalQuestions > 0 
            ? Math.round((appState.stats.attempted / appState.stats.totalQuestions) * 100) 
            : 0;
        statAttemptedEl.textContent = `${appState.stats.attempted} (${attemptPercent}%)`;
        statCorrectEl.textContent = appState.stats.correct;
        statWrongEl.textContent = appState.stats.incorrect;
        statUnattemptedEl.textContent = appState.stats.unattempted;
        statAccuracyEl.textContent = `${appState.stats.accuracy}%`;

        // 5. Inject SVG Charts
        renderCharts();

        // 6. Draw Table
        totalCountEl.textContent = appState.questions.length;
        filterAndRenderTable();
    }

    // --- 7. SVG DYNAMIC CHARTS ENGINE ---
    
    function renderCharts() {
        const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
        const labelColor = isDark ? '#94a3b8' : '#475569';
        const gridColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)';

        // ================= CHART 1: Subject Score Bar Chart =================
        const barChart = document.getElementById('score-comparison-chart');
        barChart.innerHTML = ''; // Clear previous elements
        
        const pData = appState.stats.sections["Physics"] || { marks: 0, maxMarks: 50 };
        const cData = appState.stats.sections["Chemistry"] || { marks: 0, maxMarks: 50 };
        const mData = appState.stats.sections["Mathematics"] || { marks: 0, maxMarks: 100 };
        
        const subjects = [
            { name: "Physics", marks: pData.marks, max: pData.maxMarks, color: "var(--phy-color)" },
            { name: "Chemistry", marks: cData.marks, max: cData.maxMarks, color: "var(--chem-color)" },
            { name: "Mathematics", marks: mData.marks, max: mData.maxMarks, color: "var(--math-color)" }
        ];

        // Draw vertical bar chart structure
        // Viewbox size: 500 x 280
        let barChartHtml = `
            <!-- Grid Lines & Labels -->
            <line x1="50" y1="50" x2="450" y2="50" class="svg-grid-line" stroke="${gridColor}" />
            <text x="35" y="54" class="svg-label" fill="${labelColor}" text-anchor="end">100%</text>
            
            <line x1="50" y1="100" x2="450" y2="100" class="svg-grid-line" stroke="${gridColor}" />
            <text x="35" y="104" class="svg-label" fill="${labelColor}" text-anchor="end">75%</text>
            
            <line x1="50" y1="150" x2="450" y2="150" class="svg-grid-line" stroke="${gridColor}" />
            <text x="35" y="154" class="svg-label" fill="${labelColor}" text-anchor="end">50%</text>
            
            <line x1="50" y1="200" x2="450" y2="200" class="svg-grid-line" stroke="${gridColor}" />
            <text x="35" y="204" class="svg-label" fill="${labelColor}" text-anchor="end">25%</text>
            
            <line x1="50" y1="230" x2="450" y2="230" stroke="${labelColor}" stroke-width="1" />
            <text x="35" y="234" class="svg-label" fill="${labelColor}" text-anchor="end">0%</text>
        `;

        // Draw bars
        subjects.forEach((subj, idx) => {
            const xOffset = 100 + idx * 130;
            const barWidth = 40;
            
            // Height corresponds to % of maximum
            const scorePercent = subj.max > 0 ? (subj.marks / subj.max) : 0;
            const barHeight = Math.max(scorePercent * 180, 4); // Min 4px for visibility
            const yPos = 230 - barHeight;

            // Background placeholder bar
            barChartHtml += `
                <!-- Background track bar -->
                <rect x="${xOffset}" y="50" width="${barWidth}" height="180" rx="6" fill="rgba(255,255,255,0.02)" stroke="${gridColor}" stroke-width="1" />
                
                <!-- Score value bar -->
                <rect x="${xOffset}" y="${yPos}" width="${barWidth}" height="${barHeight}" rx="6" fill="${subj.color}" class="svg-bar" opacity="0.85">
                    <title>${subj.name}: ${subj.marks}/${subj.max} (${Math.round(scorePercent * 100)}%)</title>
                </rect>
                
                <!-- Score Text Label on Bar -->
                <text x="${xOffset + barWidth/2}" y="${yPos - 8}" class="svg-label" fill="var(--text-primary)" text-anchor="middle" font-weight="bold">${subj.marks}/${subj.max}</text>
                
                <!-- Subject label -->
                <text x="${xOffset + barWidth/2}" y="254" class="svg-label" fill="${labelColor}" text-anchor="middle" font-weight="600">${subj.name}</text>
            `;
        });

        barChart.innerHTML = barChartHtml;


        // ================= CHART 2: Subject Accuracy Ring Gauge =================
        const accChart = document.getElementById('accuracy-pie-chart');
        accChart.innerHTML = '';

        // Calculate accuracy percentages for each subject
        const getSubAcc = (name) => {
            const d = appState.stats.sections[name] || { correct: 0, incorrect: 0 };
            const att = d.correct + d.incorrect;
            return att > 0 ? Math.round((d.correct / att) * 100) : 0;
        };

        const phyAcc = getSubAcc("Physics");
        const chemAcc = getSubAcc("Chemistry");
        const mathAcc = getSubAcc("Mathematics");

        const accuracies = [
            { name: "Physics", percent: phyAcc, color: "var(--phy-color)" },
            { name: "Chemistry", percent: chemAcc, color: "var(--chem-color)" },
            { name: "Mathematics", percent: mathAcc, color: "var(--math-color)" }
        ];

        // Draw horizontal high-tech glowing progress arcs
        let accChartHtml = '';

        accuracies.forEach((acc, idx) => {
            const yPos = 70 + idx * 64;
            const barWidth = 260;
            const barX = 160;
            const fillWidth = (acc.percent / 100) * barWidth;

            accChartHtml += `
                <!-- Subject Text -->
                <text x="40" y="${yPos + 12}" class="svg-label" fill="var(--text-primary)" font-weight="bold" font-size="13">${acc.name}</text>
                <text x="140" y="${yPos + 12}" class="svg-label" fill="${acc.color}" font-weight="bold" font-size="13" text-anchor="end">${acc.percent}%</text>

                <!-- Horizontal bar tracks -->
                <rect x="${barX}" y="${yPos}" width="${barWidth}" height="14" rx="7" fill="rgba(255,255,255,0.02)" stroke="${gridColor}" />
                
                <!-- Acc fill bars -->
                <rect x="${barX}" y="${yPos}" width="${fillWidth}" height="14" rx="7" fill="${acc.color}" opacity="0.9" class="svg-bar">
                    <title>${acc.name} Accuracy: ${acc.percent}%</title>
                </rect>
                
                <!-- Mini success markers/ticks inside fill -->
                <line x1="${barX + barWidth * 0.75}" y1="${yPos}" x2="${barX + barWidth * 0.75}" y2="${yPos + 14}" stroke="${gridColor}" stroke-dasharray="2" />
                <line x1="${barX + barWidth * 0.90}" y1="${yPos}" x2="${barX + barWidth * 0.90}" y2="${yPos + 14}" stroke="${gridColor}" stroke-dasharray="2" />
            `;
        });

        // Add bottom helper legend line
        accChartHtml += `
            <line x1="160" y1="240" x2="420" y2="240" stroke="${gridColor}" />
            <text x="160" y="254" class="svg-label" fill="${labelColor}">0%</text>
            <text x="290" y="254" class="svg-label" fill="${labelColor}" text-anchor="middle">50%</text>
            <text x="355" y="254" class="svg-label" fill="${labelColor}" text-anchor="middle">75%</text>
            <text x="420" y="254" class="svg-label" fill="${labelColor}" text-anchor="end">100%</text>
        `;

        accChart.innerHTML = accChartHtml;
    }

    // --- 8. REAL-TIME SEARCH & FILTER TABLE ENGINE ---

    // Subject Filter pills click handler
    subjectFiltersGroup.addEventListener('click', (e) => {
        const btn = e.target.closest('.pill');
        if (!btn) return;
        
        subjectFiltersGroup.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        appState.filters.subject = btn.getAttribute('data-subject');
        
        filterAndRenderTable();
    });

    // Status Filter pills click handler
    statusFiltersGroup.addEventListener('click', (e) => {
        const btn = e.target.closest('.pill');
        if (!btn) return;

        statusFiltersGroup.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        appState.filters.status = btn.getAttribute('data-status');

        filterAndRenderTable();
    });

    // Search query keyup input handler
    searchInput.addEventListener('input', (e) => {
        appState.filters.search = e.target.value.trim().toLowerCase();
        filterAndRenderTable();
    });

    function filterAndRenderTable() {
        const { subject, status, search } = appState.filters;

        // Perform filtering on core question set
        const filtered = appState.questions.filter(q => {
            // 1. Subject filter
            if (subject !== "all" && q.subject !== subject) return false;
            
            // 2. Status filter
            if (status !== "all" && q.status !== status) return false;
            
            // 3. Search query
            if (search && !q.id.toLowerCase().includes(search)) return false;
            
            return true;
        });

        // Set counts text
        filteredCountEl.textContent = filtered.length;
        
        // Compile body HTML
        if (filtered.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center" style="padding: 40px; color: var(--text-muted);">
                        <i class="fa-solid fa-folder-open" style="font-size: 24px; margin-bottom: 8px;"></i>
                        <p>No questions match your filter query.</p>
                    </td>
                </tr>
            `;
            return;
        }

        let rowsHtml = '';
        filtered.forEach(q => {
            const subjectTagClass = q.subject === "Physics" ? "row-subj-physics"
                                  : q.subject === "Chemistry" ? "row-subj-chemistry"
                                  : "row-subj-mathematics";
            
            let rowClass = "row-unattempted";
            let responseCell = '';
            
            if (q.status === "Correct") {
                rowClass = "row-correct";
                responseCell = `<td class="cell-correct-highlight" style="text-align: center; font-weight: bold;">${q.candidateResponse} <i class="fa-solid fa-circle-check" style="margin-left: 6px;"></i></td>`;
            } else if (q.status === "Incorrect") {
                rowClass = "row-incorrect";
                responseCell = `<td class="cell-incorrect-highlight" style="text-align: center; font-weight: bold;">${q.candidateResponse} <i class="fa-solid fa-circle-xmark" style="margin-left: 6px;"></i></td>`;
            } else {
                rowClass = "row-unattempted";
                responseCell = `<td class="cell-unattempted-highlight" style="text-align: center; color: var(--text-muted);">--</td>`;
            }

            rowsHtml += `
                <tr id="qrow-${q.id}" class="question-row ${rowClass}">
                    <td style="font-weight: 600;">
                        ${q.id}
                        <button class="copy-id-btn" data-id="${q.id}" title="Copy Question ID">
                            <i class="fa-regular fa-copy"></i>
                        </button>
                    </td>
                    <td>
                        <span class="row-subject-tag ${subjectTagClass}">${q.subject}</span>
                    </td>
                    <td style="text-align: center; font-weight: bold;">${q.correctOption}</td>
                    ${responseCell}
                </tr>
            `;
        });

        tableBody.innerHTML = rowsHtml;
        setupTableEventListeners();
    }

    function setupTableEventListeners() {
        // Copy Question ID to clipboard
        document.querySelectorAll('.copy-id-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.getAttribute('data-id');
                navigator.clipboard.writeText(id).then(() => {
                    showToast(`Copied Question ID: ${id}`, "info");
                    
                    // Momentarily change icon
                    const icon = btn.querySelector('i');
                    icon.className = 'fa-solid fa-check';
                    icon.style.color = 'var(--success-color)';
                    setTimeout(() => {
                        icon.className = 'fa-regular fa-copy';
                        icon.style.color = '';
                    }, 1200);
                });
            });
        });
    }

    // --- 9. MICRO-UI NOTIFICATIONS (TOASTS) ---
    
    function showToast(message, type = "info") {
        // Remove existing toast if present
        const existingToast = document.querySelector('.toast-notification');
        if (existingToast) existingToast.remove();
        
        // Create element
        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type}`;
        
        // Colors & Icons
        let iconClass = 'fa-circle-info';
        if (type === 'success') iconClass = 'fa-circle-check';
        if (type === 'error') iconClass = 'fa-triangle-exclamation';
        
        toast.innerHTML = `
            <i class="fa-solid ${iconClass}"></i>
            <span>${message}</span>
        `;
        
        // Style parameters
        toast.style.position = 'fixed';
        toast.style.bottom = '24px';
        toast.style.right = '24px';
        toast.style.padding = '12px 20px';
        toast.style.borderRadius = 'var(--border-radius-md)';
        toast.style.fontFamily = 'var(--font-heading)';
        toast.style.fontWeight = '600';
        toast.style.fontSize = '13.5px';
        toast.style.display = 'flex';
        toast.style.alignItems = 'center';
        toast.style.gap = '10px';
        toast.style.zIndex = '9999';
        toast.style.boxShadow = '0 10px 25px rgba(0,0,0,0.3)';
        toast.style.animation = 'fadeIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        toast.style.backdropFilter = 'blur(10px)';
        
        if (type === 'success') {
            toast.style.background = 'rgba(16, 185, 129, 0.15)';
            toast.style.border = '1px solid rgba(16, 185, 129, 0.3)';
            toast.style.color = 'var(--success-color)';
        } else if (type === 'error') {
            toast.style.background = 'rgba(239, 68, 68, 0.15)';
            toast.style.border = '1px solid rgba(239, 68, 68, 0.3)';
            toast.style.color = 'var(--danger-color)';
        } else {
            toast.style.background = 'rgba(99, 102, 241, 0.15)';
            toast.style.border = '1px solid rgba(99, 102, 241, 0.3)';
            toast.style.color = 'var(--accent-light)';
        }

        document.body.appendChild(toast);
        
        // Auto remove
        setTimeout(() => {
            toast.style.animation = 'fadeIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) reverse';
            setTimeout(() => toast.remove(), 300);
        }, 3200);
    }

    function triggerHighPerformanceCelebration() {
        if (window.confetti) {
            // Gorgeous celebration!
            const duration = 2 * 1000;
            const end = Date.now() + duration;

            (function frame() {
                // Left side
                confetti({
                    particleCount: 3,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0 },
                    colors: ['#6366f1', '#06b6d4', '#10b981', '#f59e0b']
                });
                // Right side
                confetti({
                    particleCount: 3,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1 },
                    colors: ['#6366f1', '#06b6d4', '#10b981', '#f59e0b']
                });

                if (Date.now() < end) {
                    requestAnimationFrame(frame);
                }
            }());
        }
    }

    // --- 10. LOCAL STORAGE STATE PERSISTENCE ---
    
    function saveStateToLocalStorage() {
        try {
            const stateToSave = {
                questions: appState.questions,
                stats: appState.stats,
                candidate: appState.candidate
            };
            localStorage.setItem('mhtcet_analyzer_state', JSON.stringify(stateToSave));
        } catch (e) {
            console.error("Failed to save state to localStorage:", e);
        }
    }

    function loadStateFromLocalStorage() {
        try {
            const savedStateStr = localStorage.getItem('mhtcet_analyzer_state');
            if (savedStateStr) {
                const savedState = JSON.parse(savedStateStr);
                if (savedState && savedState.questions && savedState.questions.length > 0) {
                    appState.questions = savedState.questions;
                    appState.stats = savedState.stats;
                    appState.candidate = savedState.candidate;
                    
                    // Render the dashboard immediately
                    renderDashboard();
                    
                    // Show a toast that data has been restored from last session
                    showToast("Restored your previous analysis session!", "success");
                    return true;
                }
            }
        } catch (e) {
            console.error("Failed to load state from localStorage:", e);
            localStorage.removeItem('mhtcet_analyzer_state'); // Clear corrupted state
        }
        return false;
    }

    function initTheme() {
        try {
            const savedTheme = localStorage.getItem('mhtcet_analyzer_theme') || 'dark';
            document.documentElement.setAttribute('data-theme', savedTheme);
            appState.currentTheme = savedTheme;
            
            const icon = themeToggle.querySelector('i');
            if (icon) {
                if (savedTheme === 'light') {
                    icon.className = 'fa-solid fa-sun';
                } else {
                    icon.className = 'fa-solid fa-moon';
                }
            }
        } catch (e) {
            console.error("Failed to initialize theme from localStorage:", e);
        }
    }

    // --- 11. INITIALIZATION ---
    initTheme();
    loadStateFromLocalStorage();
});
