/**
 * MHT-CET Score Calculator - Demo Data Generator
 * This file provides a high-fidelity, simulated MHTML response sheet.
 * Clicking "Demo Mode" parses this generated MHTML string through the same parser
 * as a real user upload, demonstrating the site's capability instantly.
 */

window.MHTCET_DEMO = (function() {
    function generateMockResponseSheet() {
        const subjects = [
            { name: "Physics", count: 50, startId: 901001, weight: 1, attemptRate: 0.88, correctRate: 0.78 },
            { name: "Chemistry", count: 50, startId: 902001, weight: 1, attemptRate: 0.90, correctRate: 0.82 },
            { name: "Mathematics", count: 50, startId: 903001, weight: 2, attemptRate: 0.84, correctRate: 0.75 }
        ];

        let htmlRows = "";

        subjects.forEach(subj => {
            for (let i = 0; i < subj.count; i++) {
                const questionId = subj.startId + i;
                const correctOption = Math.floor(Math.random() * 4) + 1; // Options 1 to 4
                
                let candidateResponse = "--";
                const isAttempted = Math.random() < subj.attemptRate;
                
                if (isAttempted) {
                    const isCorrect = Math.random() < subj.correctRate;
                    if (isCorrect) {
                        candidateResponse = correctOption.toString();
                    } else {
                        // Generate a different option
                        let wrongOption;
                        do {
                            wrongOption = Math.floor(Math.random() * 4) + 1;
                        } while (wrongOption === correctOption);
                        candidateResponse = wrongOption.toString();
                    }
                }

                // Generate simulated option IDs (like 9010011, 9010012, 9010013, 9010014)
                const optIds = [
                    questionId * 10 + 1,
                    questionId * 10 + 2,
                    questionId * 10 + 3,
                    questionId * 10 + 4
                ];
                const correctOptId = optIds[correctOption - 1];
                const candidateResponseId = candidateResponse === "--" ? "--" : optIds[parseInt(candidateResponse) - 1];

                // Generate highly detailed simulated MHT-CET question text and options
                let mockQuestionText = "";
                let mockOptionTexts = [];
                if (subj.name === "Physics") {
                    mockQuestionText = `A uniform sphere of mass 10 kg and radius 0.5 m is rotating about its diameter. A constant tangential force is applied. If it gains an angular velocity of 12 rad/s in 4 seconds, find the magnitude of the applied force. [Simulated Question ID: ${questionId}]`;
                    mockOptionTexts = ["1.5 N", "3.0 N", "4.5 N", "6.0 N"];
                } else if (subj.name === "Chemistry") {
                    mockQuestionText = `Identify the major organic product formed in the acid-catalyzed hydration of 3-methylbut-1-ene, and select the correct option representing the intermediate stability. [Simulated Question ID: ${questionId}]`;
                    mockOptionTexts = ["2-methylbutan-2-ol", "3-methylbutan-2-ol", "3-methylbutan-1-ol", "2-methylbutan-1-ol"];
                } else {
                    mockQuestionText = `If the line y = mx + c is a common tangent to the circle x² + y² = 25 and the parabola y² = 16x, then find the value of its y-intercept constant c. [Simulated Question ID: ${questionId}]`;
                    mockOptionTexts = ["± 5√(1 + m²)", "± 4 / m", "± 5 / m", "± 4√(1 + m²)"];
                }

                // Append row matching the real MHTCET HTML structure
                htmlRows += `
                <tr>
                    <td style="width:10%">${questionId}</td>
                    <td>${subj.name}</td>
                    <td style="width:60%">
                        <div>
                            <div class="Box">
                                <br/>
                                <p style="font-weight: 600; font-size: 13.5px; line-height: 1.5; color: var(--text-primary); margin-bottom: 12px;">
                                    ${mockQuestionText}
                                </p>
                            </div>
                        </div>
                        <table width="100%">
                            <tbody>
                                <tr>
                                    <td class="BoxOption">
                                        <div class="BoxNumber" style="float:left">${optIds[0]}</div>
                                        <div class="BoxOp" style="float:right">${mockOptionTexts[0]}</div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        <table width="100%">
                            <tbody>
                                <tr>
                                    <td class="BoxOption">
                                        <div class="BoxNumber" style="float:left">${optIds[1]}</div>
                                        <div class="BoxOp" style="float:right">${mockOptionTexts[1]}</div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        <table width="100%">
                            <tbody>
                                <tr>
                                    <td class="BoxOption">
                                        <div class="BoxNumber" style="float:left">${optIds[2]}</div>
                                        <div class="BoxOp" style="float:right">${mockOptionTexts[2]}</div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        <table width="100%">
                            <tbody>
                                <tr>
                                    <td class="BoxOption">
                                        <div class="BoxNumber" style="float:left">${optIds[3]}</div>
                                        <div class="BoxOp" style="float:right">${mockOptionTexts[3]}</div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        <br/>
                        <table class="table table-responsive table-bordered center" width="100%">
                            <tbody>
                                <tr>
                                    <td>Correct Option: <span>${correctOptId}</span></td>
                                    <td>Candidate Response: <span>${candidateResponseId}</span></td>
                                </tr>
                            </tbody>
                        </table>
                    </td>
                    <td style="width:20%">
                        <div class="form-group btn-func" style="text-align:center">
                            <span id="${questionId}" style="color:green" title="Objection raised"></span>
                            <button class="btn btn-primary btn-sm" id="RaiseObj" type="button">Raise / View Objection</button>
                        </div>
                    </td>
                </tr>`;
            }
        });

        // Wrap in full MHTML wrapper style that mimics the MHTCET portal objection sheet
        return `
        MIME-Version: 1.0
        Content-Type: multipart/related; boundary="----MultipartBoundary"

        ------MultipartBoundary
        Content-Type: text/html; charset="utf-8"

        <!DOCTYPE html>
        <html>
        <head>
            <title>Assessment - Objection Tracker Portal_ Response Sheet</title>
            <style>
                body { font-family: Arial, sans-serif; }
                #tblObjection { width: 100%; border-collapse: collapse; margin-top: 20px; }
                #tblObjection th, #tblObjection td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                #tblObjection th { background-color: #f2f2f2; }
                table.center { width: 100%; }
            </style>
        </head>
        <body>
            <div style="text-align:center; padding: 20px; background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                <h2>MAHARASHTRA STATE COMMON ENTRANCE TEST CELL</h2>
                <h3>MHT-CET 2026 Response Sheet - Candidate Evaluation Portal</h3>
                <p><strong>Candidate Name:</strong> MAHADEV R. PATIL | <strong>Roll Number:</strong> 2604901239 | <strong>Exam Date:</strong> 12/05/2026</p>
            </div>
            
            <table id="tblObjection">
                <thead>
                    <tr>
                        <th style="width:10%;">Question ID</th>
                        <th style="width:20%;">Section / Subject</th>
                        <th>Options & Response Details</th>
                    </tr>
                </thead>
                <tbody>
                    ${htmlRows}
                </tbody>
            </table>
        </body>
        </html>
        ------MultipartBoundary--
        `;
    }

    return {
        getDemoMhtml: generateMockResponseSheet
    };
})();
