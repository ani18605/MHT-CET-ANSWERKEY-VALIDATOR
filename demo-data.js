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

                // Append row matching the MHTCET HTML structure
                htmlRows += `
                <tr>
                    <td style="width:10%; text-align:center; font-weight:bold;">${questionId}</td>
                    <td style="width:20%;">${subj.name}</td>
                    <td>
                        <table class="center" style="width:100%; border-collapse:collapse;">
                            <tbody>
                                <tr>
                                    <td style="width:50%; padding: 4px;">Correct Option: <span style="font-weight:bold; color:#10b981;">${correctOption}</span></td>
                                    <td style="width:50%; padding: 4px;">Chosen Option: <span style="font-weight:bold;">${candidateResponse}</span></td>
                                </tr>
                            </tbody>
                        </table>
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
