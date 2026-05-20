from bs4 import BeautifulSoup

def check_answers(file_path, output_file="answers.txt"):
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    html_start = content.find("<!DOCTYPE html>")
    if html_start != -1:
        content = content[html_start:]
        
    soup = BeautifulSoup(content, 'html.parser')
    question_rows = soup.select('#tblObjection > tbody > tr')
    
    total_questions = 0
    attempted = 0
    correct_answers = 0
    total_marks = 0
    marks_obtained = 0
    
    # Dictionary to store stats for Physics, Chemistry, Maths, etc.
    section_stats = {}
    
    with open(output_file, 'w', encoding='utf-8') as out:
        def log(text):
            out.write(text + "\n")
            
        log(f"{'Q. ID':<10} | {'Section':<12} | {'Correct':<10} | {'Your Resp.':<10} | {'Status':<12} | {'Marks'}")
        log("-" * 77)
        
        for row in question_rows:
            tds = row.find_all('td', recursive=False)
            
            if len(tds) >= 3:
                q_id_td = tds[0]
                section_td = tds[1]
                
                if "width:10%" in q_id_td.get('style', ''):
                    question_id = q_id_td.text.strip()
                    section_name = section_td.text.strip()
                    
                    # Create the section in our tracker if it doesn't exist yet
                    if section_name not in section_stats:
                        section_stats[section_name] = {'correct': 0, 'incorrect': 0, 'marks': 0, 'max_marks': 0}
                        
                    # 2 marks for Maths, 1 mark for others
                    question_marks = 2 if "MATH" in section_name.upper() else 1
                    section_stats[section_name]['max_marks'] += question_marks
                    
                    inner_table = row.find('table', class_='center')
                    if inner_table:
                        inner_tds = inner_table.find_all('td')
                        if len(inner_tds) >= 2:
                            correct_option = inner_tds[0].find('span').text.strip()
                            candidate_response = inner_tds[1].find('span').text.strip()
                            
                            total_questions += 1
                            total_marks += question_marks
                            
                            status = "Unattempted"
                            awarded_marks = 0
                            
                            if candidate_response and candidate_response.isdigit():
                                attempted += 1
                                if candidate_response == correct_option:
                                    correct_answers += 1
                                    status = "Correct"
                                    awarded_marks = question_marks
                                    marks_obtained += awarded_marks
                                    
                                    # Update section stats
                                    section_stats[section_name]['correct'] += 1
                                    section_stats[section_name]['marks'] += awarded_marks
                                else:
                                    status = "Incorrect"
                                    # Update section stats
                                    section_stats[section_name]['incorrect'] += 1
                                    
                            log(f"{question_id:<10} | {section_name[:12]:<12} | {correct_option:<10} | {candidate_response:<10} | {status:<12} | +{awarded_marks}/{question_marks}")

        # Write Section-Wise Summary
        log("\n" + "=" * 55)
        log("               SECTION-WISE SUMMARY")
        log("=" * 55)
        log(f"{'Subject':<15} | {'Correct':<8} | {'Incorrect':<10} | {'Score'}")
        log("-" * 55)
        for sec, stats in section_stats.items():
            log(f"{sec[:15]:<15} | {stats['correct']:<8} | {stats['incorrect']:<10} | {stats['marks']}/{stats['max_marks']}")

        # Write Overall Summary
        log("\n" + "=" * 40)
        log("            OVERALL RESULTS")
        log("=" * 40)
        log(f"Total Questions : {total_questions}")
        log(f"Attempted       : {attempted}")
        log(f"Correct Answers : {correct_answers}")
        log(f"Wrong Answers   : {attempted - correct_answers}")
        log(f"Unattempted     : {total_questions - attempted}")
        log("-" * 40)
        log(f"Max Marks       : {total_marks}")
        log(f"Marks Obtained  : {marks_obtained}")
        log("=" * 40)

    print(f"Done! Check '{output_file}' for your detailed and section-wise results.")

# Run the script
import os
file_name = "Assessment - Objection Tracker Portal_ Response Sheet.mht"
if not os.path.exists(file_name):
    file_name = "Assessment - Objection Tracker Portal_ Response Sheet (1).mht"

if os.path.exists(file_name):
    check_answers(file_name)
else:
    print(f"Error: Neither '{file_name}' nor the standard response sheet was found in the workspace directory.")