"""
ASCENDIQ Year 3 Placement Preparation & Assessment Center Service
Provides backend logic for:
- Standardized Aptitude Tests (Quantitative, Logical, Verbal, Data Interpretation)
- Technical Subject Assessments (Fundamentals, DSA, OOP, DBMS, OS, Networks, Web)
- Combined Timed Mock Placement Tests
- Server-authoritative Timing, Answer Keys, and Scoring
- Test-Taking Integrity Monitoring (4-violation sequence, 5% deduction penalty)
- Idempotent Finalization and Audit Trail
- Student Progress Analytics
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, timezone, timedelta
import uuid

# Canonical Test Definitions
TEST_CATALOG: Dict[str, Dict[str, Any]] = {
    # 1. Aptitude Tests
    "apt-quant-01": {
        "id": "apt-quant-01",
        "title": "Quantitative Aptitude: Arithmetic & Problem Solving",
        "category": "aptitude",
        "sub_category": "Quantitative Aptitude",
        "description": "Essential campus recruitment screening on Time & Work, Speed & Distance, Percentages, and Probability.",
        "duration_minutes": 15,
        "question_count": 5,
        "total_marks": 5.0,
        "marks_per_question": 1.0,
        "negative_marks": 0.25,
        "difficulty": "Medium",
        "instructions": "Each correct answer awards 1 mark. Incorrect answers deduct 0.25 marks. Negative marking applies."
    },
    "apt-logic-01": {
        "id": "apt-logic-01",
        "title": "Logical Reasoning: Deductive & Analytical Patterns",
        "category": "aptitude",
        "sub_category": "Logical Reasoning",
        "description": "Tests syllogisms, blood relations, seating arrangements, and directional reasoning patterns.",
        "duration_minutes": 15,
        "question_count": 5,
        "total_marks": 5.0,
        "marks_per_question": 1.0,
        "negative_marks": 0.25,
        "difficulty": "Medium",
        "instructions": "Analyze conditions carefully before answering. Penalty of 0.25 marks per wrong answer."
    },
    "apt-verbal-01": {
        "id": "apt-verbal-01",
        "title": "Verbal Ability & Technical Comprehension",
        "category": "aptitude",
        "sub_category": "Verbal Ability",
        "description": "Evaluates sentence correction, reading comprehension, idioms, and vocabulary in technical workplace contexts.",
        "duration_minutes": 15,
        "question_count": 5,
        "total_marks": 5.0,
        "marks_per_question": 1.0,
        "negative_marks": 0.0,
        "difficulty": "Easy",
        "instructions": "No negative marking for this section. Choose the most grammatically precise option."
    },
    "apt-di-01": {
        "id": "apt-di-01",
        "title": "Data Interpretation & Chart Analysis",
        "category": "aptitude",
        "sub_category": "Data Interpretation",
        "description": "Tests numerical trend extraction from bar charts, pie charts, and tabular production metrics.",
        "duration_minutes": 15,
        "question_count": 5,
        "total_marks": 5.0,
        "marks_per_question": 1.0,
        "negative_marks": 0.25,
        "difficulty": "Medium",
        "instructions": "Calculate percentages and ratios accurately. Penalty of 0.25 marks per incorrect choice."
    },

    # 2. Technical Tests
    "tech-dsa-01": {
        "id": "tech-dsa-01",
        "title": "Data Structures & Algorithmic Complexity",
        "category": "technical",
        "sub_category": "Data Structures & Algorithms",
        "description": "Evaluates asymptotic time-space analysis, trees, heaps, graphs, hashing, and recursive memoization.",
        "duration_minutes": 20,
        "question_count": 5,
        "total_marks": 5.0,
        "marks_per_question": 1.0,
        "negative_marks": 0.25,
        "difficulty": "Hard",
        "instructions": "Analyze edge cases and Big-O runtime bounds. 0.25 penalty for wrong answers."
    },
    "tech-dbms-01": {
        "id": "tech-dbms-01",
        "title": "Database Management Systems & SQL Mechanics",
        "category": "technical",
        "sub_category": "DBMS & SQL",
        "description": "Tests B-Tree indexing, ACID transactions, normalization up to BCNF, and SQL window functions.",
        "duration_minutes": 15,
        "question_count": 5,
        "total_marks": 5.0,
        "marks_per_question": 1.0,
        "negative_marks": 0.25,
        "difficulty": "Medium",
        "instructions": "Examine concurrency isolation and normalization rules closely."
    },
    "tech-os-01": {
        "id": "tech-os-01",
        "title": "Operating Systems & Concurrency Internals",
        "category": "technical",
        "sub_category": "Operating Systems",
        "description": "Covers process scheduling, virtual memory paging, multithreading synchronization, and deadlocks.",
        "duration_minutes": 15,
        "question_count": 5,
        "total_marks": 5.0,
        "marks_per_question": 1.0,
        "negative_marks": 0.0,
        "difficulty": "Medium",
        "instructions": "Answer questions on process lifecycle and semaphores."
    },
    "tech-networks-01": {
        "id": "tech-networks-01",
        "title": "Computer Networks & Protocol Architectures",
        "category": "technical",
        "sub_category": "Computer Networks",
        "description": "Evaluates TCP 3-way handshake, subnetting, DNS resolution, HTTP/HTTPS, and OSI layer responsibilities.",
        "duration_minutes": 15,
        "question_count": 5,
        "total_marks": 5.0,
        "marks_per_question": 1.0,
        "negative_marks": 0.25,
        "difficulty": "Medium",
        "instructions": "Understand IP packet headers and socket communication."
    },
    "tech-web-01": {
        "id": "tech-web-01",
        "title": "Web Architecture, REST APIs & Security",
        "category": "technical",
        "sub_category": "Web Development",
        "description": "Tests stateless REST principles, CORS, JWT authentication, and browser DOM rendering cycles.",
        "duration_minutes": 15,
        "question_count": 5,
        "total_marks": 5.0,
        "marks_per_question": 1.0,
        "negative_marks": 0.0,
        "difficulty": "Easy",
        "instructions": "Covers modern frontend-backend client-server communication."
    },

    # 3. Combined Mock Placement Tests
    "mock-full-01": {
        "id": "mock-full-01",
        "title": "Combined Full-Length Campus Placement Mock Test",
        "category": "mock",
        "sub_category": "Comprehensive Mock",
        "description": "Full simulation mirroring tier-1 campus recruitment drives. Combines Quantitative Aptitude, Logical Reasoning, DSA, and DBMS.",
        "duration_minutes": 30,
        "question_count": 10,
        "total_marks": 10.0,
        "marks_per_question": 1.0,
        "negative_marks": 0.25,
        "difficulty": "Hard",
        "instructions": "Simulates standard 30-minute campus recruitment tests. Strict tab monitoring and full-screen compliance enforced."
    }
}

# Master Question Bank with Validated Explanations & Answer Keys
QUESTION_BANK: Dict[str, List[Dict[str, Any]]] = {
    "apt-quant-01": [
        {
            "id": "q-quant-1",
            "topic": "Time & Work",
            "question_text": "A can complete a software module in 12 days, and B can complete the same module in 18 days. If they collaborate together, how many days will they take to complete the module?",
            "options": [
                {"id": "A", "text": "6.0 days"},
                {"id": "B", "text": "7.2 days"},
                {"id": "C", "text": "8.5 days"},
                {"id": "D", "text": "9.0 days"}
            ],
            "correct_option": "B",
            "explanation": "Work done per day = (1/12) + (1/18) = (3 + 2)/36 = 5/36. Total days needed = 36 / 5 = 7.2 days."
        },
        {
            "id": "q-quant-2",
            "topic": "Speed, Distance & Time",
            "question_text": "A train running at 72 km/h crosses a 200-meter platform in 22 seconds. What is the length of the train?",
            "options": [
                {"id": "A", "text": "220 meters"},
                {"id": "B", "text": "240 meters"},
                {"id": "C", "text": "260 meters"},
                {"id": "D", "text": "280 meters"}
            ],
            "correct_option": "B",
            "explanation": "Speed in m/s = 72 * (5/18) = 20 m/s. Total distance in 22s = 20 * 22 = 440m. Train length = 440m - 200m (platform) = 240 meters."
        },
        {
            "id": "q-quant-3",
            "topic": "Percentages & Profit",
            "question_text": "If the price of a cloud subscription increases by 25%, by what percentage must a department reduce consumption so that total expenditure remains unchanged?",
            "options": [
                {"id": "A", "text": "20%"},
                {"id": "B", "text": "25%"},
                {"id": "C", "text": "16.67%"},
                {"id": "D", "text": "22.5%"}
            ],
            "correct_option": "A",
            "explanation": "Formula: Reduction = [R / (100 + R)] * 100 = [25 / 125] * 100 = (1/5) * 100 = 20%."
        },
        {
            "id": "q-quant-4",
            "topic": "Permutation & Probability",
            "question_text": "A team of 4 engineers is to be selected from a pool of 6 frontend and 4 backend developers. What is the probability that exactly 2 backend developers are selected?",
            "options": [
                {"id": "A", "text": "15/42"},
                {"id": "B", "text": "90/210 (3/7)"},
                {"id": "C", "text": "1/2"},
                {"id": "D", "text": "4/9"}
            ],
            "correct_option": "B",
            "explanation": "Total ways = 10C4 = 210. Favorable ways = (4C2 * 6C2) = 6 * 15 = 90. Probability = 90 / 210 = 3/7 ≈ 42.8%."
        },
        {
            "id": "q-quant-5",
            "topic": "Averages & Mixtures",
            "question_text": "The average code review score of 5 developers was 82. When a 6th developer joined, the average score rose to 84. What was the score of the 6th developer?",
            "options": [
                {"id": "A", "text": "88"},
                {"id": "B", "text": "92"},
                {"id": "C", "text": "94"},
                {"id": "D", "text": "96"}
            ],
            "correct_option": "C",
            "explanation": "Sum of 5 developers = 5 * 82 = 410. Sum of 6 developers = 6 * 84 = 504. Score of 6th = 504 - 410 = 94."
        }
    ],

    "apt-logic-01": [
        {
            "id": "q-logic-1",
            "topic": "Syllogisms",
            "question_text": "Statements: (1) All algorithms are procedures. (2) Some procedures are heuristics. Conclusion I: Some algorithms are heuristics. Conclusion II: All procedures are algorithms.",
            "options": [
                {"id": "A", "text": "Only Conclusion I follows"},
                {"id": "B", "text": "Only Conclusion II follows"},
                {"id": "C", "text": "Neither Conclusion I nor II follows"},
                {"id": "D", "text": "Both conclusions follow"}
            ],
            "correct_option": "C",
            "explanation": "All algorithms are inside procedures, and some procedures overlap with heuristics. There is no guaranteed intersection between algorithms and heuristics. Therefore, neither follows."
        },
        {
            "id": "q-logic-2",
            "topic": "Coding-Decoding",
            "question_text": "In a certain code, 'BINARY' is encoded as 'CKPBTY'. By following the identical alphabetical transformation rule, how is 'STRING' encoded?",
            "options": [
                {"id": "A", "text": "TTUKPI"},
                {"id": "B", "text": "TUUKPI"},
                {"id": "C", "text": "TUULQJ"},
                {"id": "D", "text": "TTTKPI"}
            ],
            "correct_option": "B",
            "explanation": "Pattern: +1, +2, +1, +2, +1, +2 shifts. S(+1)=T, T(+2)=V or U? B->C (+1), I->K (+2), N->P (+2)? Here B+1=C, I+2=K, N+2=P, A+1=B, R+2=T, Y+0=Y. S+1=T, T+1=U, R+3=U, I+2=K, N+2=P, G+2=I -> TUUKPI."
        },
        {
            "id": "q-logic-3",
            "topic": "Blood Relations",
            "question_text": "Pointing to a photograph of a tech founder, Priya said, 'His mother is the only daughter of my maternal grandfather.' How is Priya related to the founder?",
            "options": [
                {"id": "A", "text": "Aunt"},
                {"id": "B", "text": "Sister"},
                {"id": "C", "text": "Mother"},
                {"id": "D", "text": "Daughter"}
            ],
            "correct_option": "B",
            "explanation": "The only daughter of Priya's maternal grandfather is Priya's own mother. The founder's mother is Priya's mother. Therefore, Priya and the founder are siblings (Priya is his sister)."
        },
        {
            "id": "q-logic-4",
            "topic": "Seating Arrangement",
            "question_text": "Five engineers (A, B, C, D, E) sit in a row facing north during a standup. B is adjacent to D and E. C is on the extreme right. A is on the extreme left. Who sits in the exact middle?",
            "options": [
                {"id": "A", "text": "B"},
                {"id": "B", "text": "D"},
                {"id": "C", "text": "E"},
                {"id": "D", "text": "Cannot be determined"}
            ],
            "correct_option": "A",
            "explanation": "Left to right: A is index 0, C is index 4. B is adjacent to D and E, meaning D-B-E or E-B-D occupies indices 1, 2, 3. In both cases, B is at index 2 (the exact middle)."
        },
        {
            "id": "q-logic-5",
            "topic": "Direction Sense",
            "question_text": "A campus robot moves 10m North, turns Right and moves 15m, turns Right again and moves 10m, and finally turns Left and moves 5m. In which direction and distance is it from the origin?",
            "options": [
                {"id": "A", "text": "20m East"},
                {"id": "B", "text": "15m East"},
                {"id": "C", "text": "25m South"},
                {"id": "D", "text": "20m North"}
            ],
            "correct_option": "A",
            "explanation": "North 10m, East 15m, South 10m (returns to North-South baseline, 15m East), then turns Left (East) 5m. Total displacement = 15m + 5m = 20m East."
        }
    ],

    "apt-verbal-01": [
        {
            "id": "q-verb-1",
            "topic": "Sentence Correction",
            "question_text": "Identify the grammatically correct sentence for an engineering design report:",
            "options": [
                {"id": "A", "text": "Neither the software architect nor the developers was aware of the memory leak."},
                {"id": "B", "text": "Neither the software architect nor the developers were aware of the memory leak."},
                {"id": "C", "text": "Neither the software architect or the developers was aware of the memory leak."},
                {"id": "D", "text": "Neither the software architect nor the developers is aware of the memory leak."}
            ],
            "correct_option": "B",
            "explanation": "In 'Neither ... nor ...', the verb agrees with the closer subject. 'developers' is plural, so 'were aware' is grammatically correct."
        },
        {
            "id": "q-verb-2",
            "topic": "Vocabulary in Context",
            "question_text": "Choose the word closest in meaning to 'UBIQUITOUS' in the sentence: 'Microservice architectures have become ubiquitous across modern cloud infrastructure.'",
            "options": [
                {"id": "A", "text": "Obsolete"},
                {"id": "B", "text": "Omnipresent (Ever-present)"},
                {"id": "C", "text": "Experimental"},
                {"id": "D", "text": "Vulnerable"}
            ],
            "correct_option": "B",
            "explanation": "'Ubiquitous' means present, appearing, or found everywhere."
        },
        {
            "id": "q-verb-3",
            "topic": "Reading Comprehension",
            "question_text": "'Idempotence ensures that performing an operation multiple times produces the identical outcome as a single execution.' Which of the following conforms to this statement?",
            "options": [
                {"id": "A", "text": "Calling an idempotent API twice will double the debit amount on an account."},
                {"id": "B", "text": "Submitting an idempotent update multiple times preserves system state consistency."},
                {"id": "C", "text": "Idempotent endpoints can only ever be accessed once in their lifetime."},
                {"id": "D", "text": "Idempotence increases database duplicate rows exponentially."}
            ],
            "correct_option": "B",
            "explanation": "By definition, multiple identical executions produce the same state as one, preventing duplicate side effects."
        },
        {
            "id": "q-verb-4",
            "topic": "Idioms & Technical Communication",
            "question_text": "What does the phrase 'to cut corners' mean in engineering delivery context?",
            "options": [
                {"id": "A", "text": "Refactoring circular dependencies in code"},
                {"id": "B", "text": "Doing something poorly or taking shortcuts to save time or cost"},
                {"id": "C", "text": "Measuring polygon angles in CAD drawings"},
                {"id": "D", "text": "Implementing binary tree trimming algorithms"}
            ],
            "correct_option": "B",
            "explanation": "'Cutting corners' means compromising quality or skipping vital verification steps to rush a deadline."
        },
        {
            "id": "q-verb-5",
            "topic": "Para-jumbles",
            "question_text": "Arrange the sentences into a coherent sequence: (1) Therefore, automated tests ran on every commit. (2) The engineering team integrated CI/CD pipelines. (3) Bug detection latency was dramatically reduced.",
            "options": [
                {"id": "A", "text": "2 -> 1 -> 3"},
                {"id": "B", "text": "3 -> 1 -> 2"},
                {"id": "C", "text": "1 -> 2 -> 3"},
                {"id": "D", "text": "2 -> 3 -> 1"}
            ],
            "correct_option": "A",
            "explanation": "Integrating CI/CD (2) led to tests running automatically on commits (1), which resulted in reduced bug latency (3)."
        }
    ],

    "apt-di-01": [
        {
            "id": "q-di-1",
            "topic": "Table Data Analysis",
            "question_text": "A dataset lists server request latency: Region A = 120ms, Region B = 160ms, Region C = 100ms, Region D = 220ms. What is the percentage difference in latency between Region D and Region C relative to Region C?",
            "options": [
                {"id": "A", "text": "100%"},
                {"id": "B", "text": "120%"},
                {"id": "C", "text": "150%"},
                {"id": "D", "text": "80%"}
            ],
            "correct_option": "B",
            "explanation": "Difference = 220ms - 100ms = 120ms. Percentage relative to Region C = (120 / 100) * 100 = 120%."
        },
        {
            "id": "q-di-2",
            "topic": "Ratio Analysis",
            "question_text": "In a sprint, team Alpha completed 45 story points and team Beta completed 60 story points. What is the ratio of team Alpha's completed work to the total completed work?",
            "options": [
                {"id": "A", "text": "3:4"},
                {"id": "B", "text": "3:7"},
                {"id": "C", "text": "4:7"},
                {"id": "D", "text": "5:8"}
            ],
            "correct_option": "B",
            "explanation": "Total points = 45 + 60 = 105. Ratio = 45 / 105 = 3 / 7."
        },
        {
            "id": "q-di-3",
            "topic": "Pie Chart Distribution",
            "question_text": "A cloud budget pie chart allocates 30% to Compute, 25% to Database, 20% to Storage, 15% to Networking, and 10% to Logging. If the total monthly budget is $8,000, how much is spent on Compute and Database combined?",
            "options": [
                {"id": "A", "text": "$4,000"},
                {"id": "B", "text": "$4,400"},
                {"id": "C", "text": "$4,800"},
                {"id": "D", "text": "$5,200"}
            ],
            "correct_option": "B",
            "explanation": "Compute (30%) + Database (25%) = 55%. Total = 0.55 * $8,000 = $4,400."
        },
        {
            "id": "q-di-4",
            "topic": "Bar Chart Trends",
            "question_text": "Monthly bug count dropped from 150 in January to 90 in March. What is the percentage reduction over this period?",
            "options": [
                {"id": "A", "text": "40%"},
                {"id": "B", "text": "50%"},
                {"id": "C", "text": "60%"},
                {"id": "D", "text": "33.3%"}
            ],
            "correct_option": "A",
            "explanation": "Reduction = 150 - 90 = 60. Percentage reduction = (60 / 150) * 100 = 40%."
        },
        {
            "id": "q-di-5",
            "topic": "Data Comparison",
            "question_text": "If Service A has an uptime of 99.9% in a 30-day month (720 hours), approximately how much total downtime occurred?",
            "options": [
                {"id": "A", "text": "43.2 minutes"},
                {"id": "B", "text": "7.2 hours"},
                {"id": "C", "text": "1.5 hours"},
                {"id": "D", "text": "12.0 minutes"}
            ],
            "correct_option": "A",
            "explanation": "Downtime = 0.1% of 720 hours = 0.72 hours = 0.72 * 60 minutes = 43.2 minutes."
        }
    ],

    "tech-dsa-01": [
        {
            "id": "q-dsa-1",
            "topic": "Time Complexity",
            "question_text": "What is the worst-case time complexity of searching for an element in an unindexed Balanced Binary Search Tree (AVL / Red-Black Tree) with N nodes?",
            "options": [
                {"id": "A", "text": "O(1)"},
                {"id": "B", "text": "O(log N)"},
                {"id": "C", "text": "O(N)"},
                {"id": "D", "text": "O(N log N)"}
            ],
            "correct_option": "B",
            "explanation": "Because self-balancing trees strictly maintain a height bound of O(log N), search, insertion, and deletion are guaranteed O(log N) in both average and worst cases."
        },
        {
            "id": "q-dsa-2",
            "topic": "Graph Algorithms",
            "question_text": "Which algorithm is best suited for finding the shortest path from a single source to all vertices in a weighted directed graph that contains no negative edge weights?",
            "options": [
                {"id": "A", "text": "Floyd-Warshall Algorithm"},
                {"id": "B", "text": "Dijkstra's Algorithm using Min-Heap"},
                {"id": "C", "text": "Prim's Minimum Spanning Tree"},
                {"id": "D", "text": "Kruskal's Algorithm"}
            ],
            "correct_option": "B",
            "explanation": "Dijkstra's algorithm with a min-heap operates in O((V + E) log V) and is optimal for single-source shortest paths on non-negative weighted graphs."
        },
        {
            "id": "q-dsa-3",
            "topic": "Hashing & Collisions",
            "question_text": "What is the average time complexity of inserting a key-value pair into a Hash Table that implements Separate Chaining with a good hash function and load factor < 0.75?",
            "options": [
                {"id": "A", "text": "O(1)"},
                {"id": "B", "text": "O(log N)"},
                {"id": "C", "text": "O(N)"},
                {"id": "D", "text": "O(N^2)"}
            ],
            "correct_option": "A",
            "explanation": "With uniform hashing and a bounded load factor, chain lengths average O(1), yielding O(1) expected time for lookup and insertion."
        },
        {
            "id": "q-dsa-4",
            "topic": "Dynamic Programming",
            "question_text": "The classic 0/1 Knapsack problem with N items and maximum weight capacity W can be solved in pseudo-polynomial time using dynamic programming with what complexity?",
            "options": [
                {"id": "A", "text": "O(2^N)"},
                {"id": "B", "text": "O(N * W)"},
                {"id": "C", "text": "O(N + W)"},
                {"id": "D", "text": "O(N log W)"}
            ],
            "correct_option": "B",
            "explanation": "The DP table requires state DP[i][w] computed over N items and W weight steps, giving O(N * W) time and space."
        },
        {
            "id": "q-dsa-5",
            "topic": "Sorting Mechanics",
            "question_text": "Which of the following sorting algorithms is stable and guarantees O(N log N) worst-case time complexity without auxiliary O(N) space degradation?",
            "options": [
                {"id": "A", "text": "Quick Sort"},
                {"id": "B", "text": "Merge Sort"},
                {"id": "C", "text": "Heap Sort"},
                {"id": "D", "text": "Selection Sort"}
            ],
            "correct_option": "B",
            "explanation": "Merge Sort is stable and guarantees O(N log N) worst case across all inputs (though it uses O(N) auxiliary memory)."
        }
    ],

    "tech-dbms-01": [
        {
            "id": "q-dbms-1",
            "topic": "ACID Properties",
            "question_text": "Which ACID transaction property guarantees that concurrent execution of transactions leaves the database in the same state as if they were executed sequentially?",
            "options": [
                {"id": "A", "text": "Atomicity"},
                {"id": "B", "text": "Consistency"},
                {"id": "C", "text": "Isolation"},
                {"id": "D", "text": "Durability"}
            ],
            "correct_option": "C",
            "explanation": "Isolation ensures that transactions execute without interference from concurrent transactions (serializability)."
        },
        {
            "id": "q-dbms-2",
            "topic": "Indexing Mechanics",
            "question_text": "Why are B+ Trees widely preferred over Binary Search Trees for disk-based relational database indexes (e.g., PostgreSQL, MySQL InnoDB)?",
            "options": [
                {"id": "A", "text": "B+ Trees hold all keys in RAM only"},
                {"id": "B", "text": "High fan-out reduces tree height and minimizes disk I/O operations"},
                {"id": "C", "text": "B+ Trees eliminate the need for transaction logging"},
                {"id": "D", "text": "B+ Trees execute in O(1) worst-case lookup time"}
            ],
            "correct_option": "B",
            "explanation": "A high fan-out (hundreds of keys per node) keeps the tree height low (typically 3-4 levels), minimizing costly disk block reads."
        },
        {
            "id": "q-dbms-3",
            "topic": "Normalization",
            "question_text": "A relational table is in Third Normal Form (3NF) if and only if it is in 2NF and has no:",
            "options": [
                {"id": "A", "text": "Primary keys"},
                {"id": "B", "text": "Transitive functional dependencies between non-prime attributes"},
                {"id": "C", "text": "Foreign key relationships"},
                {"id": "D", "text": "Multi-valued attributes"}
            ],
            "correct_option": "B",
            "explanation": "3NF eliminates transitive dependencies (X -> Y and Y -> Z where Z depends on non-key Y)."
        },
        {
            "id": "q-dbms-4",
            "topic": "SQL Queries",
            "question_text": "Which SQL clause is used to filter records AFTER an aggregation GROUP BY operation has been calculated?",
            "options": [
                {"id": "A", "text": "WHERE"},
                {"id": "B", "text": "HAVING"},
                {"id": "C", "text": "ORDER BY"},
                {"id": "D", "text": "PARTITION BY"}
            ],
            "correct_option": "B",
            "explanation": "WHERE filters rows before aggregation; HAVING filters aggregate groups after calculations."
        },
        {
            "id": "q-dbms-5",
            "topic": "Locking & Deadlocks",
            "question_text": "Two-Phase Locking (2PL) protocol guarantees which critical database scheduling property?",
            "options": [
                {"id": "A", "text": "Deadlock-free execution"},
                {"id": "B", "text": "Conflict serializability"},
                {"id": "C", "text": "Instantaneous commit times"},
                {"id": "D", "text": "Zero lock contention"}
            ],
            "correct_option": "B",
            "explanation": "2PL guarantees conflict serializability, although it does not prevent deadlocks on its own."
        }
    ],

    "tech-os-01": [
        {
            "id": "q-os-1",
            "topic": "Process vs Thread",
            "question_text": "Which resource is shared among all threads created within the same operating system process?",
            "options": [
                {"id": "A", "text": "Stack memory"},
                {"id": "B", "text": "CPU Registers"},
                {"id": "C", "text": "Heap memory and file descriptors"},
                {"id": "D", "text": "Thread Local Storage"}
            ],
            "correct_option": "C",
            "explanation": "Threads of the same process share the heap, data segment, and open file descriptors, but maintain separate stacks and register contexts."
        },
        {
            "id": "q-os-2",
            "topic": "Deadlocks",
            "question_text": "Which of the following is NOT one of Coffman's four necessary conditions for a deadlock to occur?",
            "options": [
                {"id": "A", "text": "Mutual Exclusion"},
                {"id": "B", "text": "Hold and Wait"},
                {"id": "C", "text": "Preemption allowed"},
                {"id": "D", "text": "Circular Wait"}
            ],
            "correct_option": "C",
            "explanation": "The condition is NO preemption. If resources can be preempted, deadlocks can be broken."
        },
        {
            "id": "q-os-3",
            "topic": "Virtual Memory",
            "question_text": "What is the phenomenon called when the operating system spends more time swapping pages in and out of secondary storage than executing user instructions?",
            "options": [
                {"id": "A", "text": "Belady's Anomaly"},
                {"id": "B", "text": "Thrashing"},
                {"id": "C", "text": "Fragmentation"},
                {"id": "D", "text": "Context switching"}
            ],
            "correct_option": "B",
            "explanation": "Thrashing occurs when active working sets exceed physical RAM, causing constant page faults and disk swapping."
        },
        {
            "id": "q-os-4",
            "topic": "CPU Scheduling",
            "question_text": "Which CPU scheduling algorithm is non-preemptive and can cause starvation of longer processes?",
            "options": [
                {"id": "A", "text": "Round Robin (RR)"},
                {"id": "B", "text": "Shortest Job First (Non-preemptive SJF)"},
                {"id": "C", "text": "Multi-Level Feedback Queue"},
                {"id": "D", "text": "Completely Fair Scheduler (CFS)"}
            ],
            "correct_option": "B",
            "explanation": "SJF always schedules the shortest available process, meaning long processes starve if short jobs continually arrive."
        },
        {
            "id": "q-os-5",
            "topic": "Inter-Process Communication",
            "question_text": "Which synchronization primitive uses a counter and two atomic operations (wait/P and signal/V) to control access to shared resources?",
            "options": [
                {"id": "A", "text": "Spinlock only"},
                {"id": "B", "text": "Counting Semaphore"},
                {"id": "C", "text": "Condition Variable only"},
                {"id": "D", "text": "Atomic Pointer"}
            ],
            "correct_option": "B",
            "explanation": "A counting semaphore uses an integer counter with atomic wait() (decrement) and signal() (increment) operations."
        }
    ],

    "tech-networks-01": [
        {
            "id": "q-net-1",
            "topic": "TCP Handshake",
            "question_text": "What is the correct flag sequence in the standard TCP 3-way handshake used to establish a reliable connection between client and server?",
            "options": [
                {"id": "A", "text": "SYN -> SYN-ACK -> ACK"},
                {"id": "B", "text": "ACK -> SYN -> ACK"},
                {"id": "C", "text": "FIN -> FIN-ACK -> ACK"},
                {"id": "D", "text": "RST -> SYN -> ACK"}
            ],
            "correct_option": "A",
            "explanation": "Client sends SYN; server responds with SYN-ACK; client confirms with ACK."
        },
        {
            "id": "q-net-2",
            "topic": "OSI Reference Model",
            "question_text": "At which layer of the OSI model does the TLS/SSL handshake operate to encrypt application transport streams?",
            "options": [
                {"id": "A", "text": "Network Layer (Layer 3)"},
                {"id": "B", "text": "Transport / Presentation Layer (Layer 4/6)"},
                {"id": "C", "text": "Data Link Layer (Layer 2)"},
                {"id": "D", "text": "Physical Layer (Layer 1)"}
            ],
            "correct_option": "B",
            "explanation": "TLS sits between transport (TCP) and application protocols (HTTP), historically mapped to session/presentation layers."
        },
        {
            "id": "q-net-3",
            "topic": "IP Subnetting",
            "question_text": "How many usable host IP addresses are available in a /28 IPv4 subnet (Subnet mask 255.255.255.240)?",
            "options": [
                {"id": "A", "text": "16"},
                {"id": "B", "text": "14"},
                {"id": "C", "text": "30"},
                {"id": "D", "text": "12"}
            ],
            "correct_option": "B",
            "explanation": "A /28 network has 32 - 28 = 4 host bits = 2^4 = 16 addresses. Subtracting 2 (network and broadcast) yields 14 usable host IPs."
        },
        {
            "id": "q-net-4",
            "topic": "DNS & Protocols",
            "question_text": "Which transport protocol does standard DNS primarily use for client domain name lookups due to low latency?",
            "options": [
                {"id": "A", "text": "UDP port 53"},
                {"id": "B", "text": "TCP port 80"},
                {"id": "C", "text": "SCTP port 443"},
                {"id": "D", "text": "ICMP"}
            ],
            "correct_option": "A",
            "explanation": "Standard DNS queries use UDP on port 53 for fast stateless query-response without connection overhead."
        },
        {
            "id": "q-net-5",
            "topic": "HTTP Status Codes",
            "question_text": "Which HTTP status code indicates that the client request was understood and authenticated, but the user lacks authorization permission to access the resource?",
            "options": [
                {"id": "A", "text": "401 Unauthorized (Unauthenticated)"},
                {"id": "B", "text": "403 Forbidden"},
                {"id": "C", "text": "404 Not Found"},
                {"id": "D", "text": "405 Method Not Allowed"}
            ],
            "correct_option": "B",
            "explanation": "401 indicates missing or invalid authentication credentials; 403 Forbidden indicates the server understands who the user is but refuses access."
        }
    ],

    "tech-web-01": [
        {
            "id": "q-web-1",
            "topic": "RESTful Architecture",
            "question_text": "Which HTTP method should be used according to REST semantics to perform a partial update on a specific resource?",
            "options": [
                {"id": "A", "text": "POST"},
                {"id": "B", "text": "PUT"},
                {"id": "C", "text": "PATCH"},
                {"id": "D", "text": "OPTIONS"}
            ],
            "correct_option": "C",
            "explanation": "PUT replaces the complete entity; PATCH applies partial modifications to a resource."
        },
        {
            "id": "q-web-2",
            "topic": "CORS Security",
            "question_text": "What does the browser's Cross-Origin Resource Sharing (CORS) mechanism protect against?",
            "options": [
                {"id": "A", "text": "SQL injection in backend endpoints"},
                {"id": "B", "text": "Malicious frontend scripts on one origin making unauthorized requests to another origin using stored cookies"},
                {"id": "C", "text": "Memory leaks in the JavaScript V8 engine"},
                {"id": "D", "text": "DDoS attacks on the web server"}
            ],
            "correct_option": "B",
            "explanation": "CORS enforces the Same-Origin Policy in the client browser to control cross-origin HTTP requests."
        },
        {
            "id": "q-web-3",
            "topic": "JWT Architecture",
            "question_text": "A JSON Web Token (JWT) consists of which three period-separated parts in order?",
            "options": [
                {"id": "A", "text": "Payload.Header.Signature"},
                {"id": "B", "text": "Header.Payload.Signature"},
                {"id": "C", "text": "Signature.Header.Payload"},
                {"id": "D", "text": "Token.Data.Hash"}
            ],
            "correct_option": "B",
            "explanation": "JWT structure is base64url-encoded Header . Payload . Signature."
        },
        {
            "id": "q-web-4",
            "topic": "DOM & Performance",
            "question_text": "Why do modern frontend frameworks (such as React) utilize a Virtual DOM in memory?",
            "options": [
                {"id": "A", "text": "To bypass browser JavaScript execution entirely"},
                {"id": "B", "text": "To batch and minimize expensive real browser DOM layout recalculations and repaints"},
                {"id": "C", "text": "To encrypt HTML documents on the client"},
                {"id": "D", "text": "To replace CSS cascading styles"}
            ],
            "correct_option": "B",
            "explanation": "Recomputing the real DOM tree causes expensive reflows; diffing the Virtual DOM batches optimal minimal mutations."
        },
        {
            "id": "q-web-5",
            "topic": "State Management",
            "question_text": "Which React hook is designed to manage complex state transitions using a reducer function `(state, action) => newState`?",
            "options": [
                {"id": "A", "text": "useState"},
                {"id": "B", "text": "useReducer"},
                {"id": "C", "text": "useRef"},
                {"id": "D", "text": "useCallback"}
            ],
            "correct_option": "B",
            "explanation": "useReducer is the standard hook for complex state logic following Redux-style action dispatching."
        }
    ],

    "mock-full-01": [
        # Combined 10-Question Comprehensive Mock: 5 Aptitude + 5 Technical
        {
            "id": "q-mock-1",
            "topic": "Quantitative Aptitude",
            "question_text": "Two software services A and B complete a pipeline in 10 hours and 15 hours respectively. Working together, how many hours will they take?",
            "options": [
                {"id": "A", "text": "5.0 hours"},
                {"id": "B", "text": "6.0 hours"},
                {"id": "C", "text": "7.5 hours"},
                {"id": "D", "text": "8.0 hours"}
            ],
            "correct_option": "B",
            "explanation": "1/10 + 1/15 = (3 + 2)/30 = 5/30 = 1/6. Time = 6.0 hours."
        },
        {
            "id": "q-mock-2",
            "topic": "Speed & Time",
            "question_text": "A packet transmission rate is 100 MB/s. How long does it take to transfer a 7.5 GB file (1 GB = 1000 MB)?",
            "options": [
                {"id": "A", "text": "60 seconds"},
                {"id": "B", "text": "75 seconds"},
                {"id": "C", "text": "85 seconds"},
                {"id": "D", "text": "90 seconds"}
            ],
            "correct_option": "B",
            "explanation": "7.5 GB = 7,500 MB. 7,500 MB / 100 MB/s = 75 seconds."
        },
        {
            "id": "q-mock-3",
            "topic": "Logical Deduction",
            "question_text": "If all Microservices are Distributed Systems, and no Monolith is a Microservice, which of the following is logically sound?",
            "options": [
                {"id": "A", "text": "No Monolith can be a Distributed System"},
                {"id": "B", "text": "Some Distributed Systems are not Monoliths (specifically, the microservices)"},
                {"id": "C", "text": "All Distributed Systems are Monoliths"},
                {"id": "D", "text": "Microservices cannot scale"}
            ],
            "correct_option": "B",
            "explanation": "Microservices are inside Distributed Systems and are disjoint from Monoliths; hence those distributed systems are not monoliths."
        },
        {
            "id": "q-mock-4",
            "topic": "Data Interpretation",
            "question_text": "A team resolves 120 bugs in Sprint 1 and 180 bugs in Sprint 2. What is the percentage increase in resolved bugs?",
            "options": [
                {"id": "A", "text": "33.3%"},
                {"id": "B", "text": "50.0%"},
                {"id": "C", "text": "60.0%"},
                {"id": "D", "text": "66.7%"}
            ],
            "correct_option": "B",
            "explanation": "(180 - 120) / 120 = 60 / 120 = 50.0% increase."
        },
        {
            "id": "q-mock-5",
            "topic": "Verbal Technical Grammar",
            "question_text": "Choose the most appropriate word: 'The cache was invalidated to prevent serving ______ data to users.'",
            "options": [
                {"id": "A", "text": "stale"},
                {"id": "B", "text": "crisp"},
                {"id": "C", "text": "immutable"},
                {"id": "D", "text": "resilient"}
            ],
            "correct_option": "A",
            "explanation": "In computer systems caching, out-of-date or expired cached data is referred to as 'stale'."
        },
        {
            "id": "q-mock-6",
            "topic": "Data Structures & Big-O",
            "question_text": "What is the worst-case time complexity of QuickSort when the pivot is consistently chosen as the smallest or largest element?",
            "options": [
                {"id": "A", "text": "O(N log N)"},
                {"id": "B", "text": "O(N^2)"},
                {"id": "C", "text": "O(N)"},
                {"id": "D", "text": "O(log N)"}
            ],
            "correct_option": "B",
            "explanation": "Unbalanced partitions (1 element vs N-1 elements) yield the recurrence T(N) = T(N-1) + O(N) = O(N^2)."
        },
        {
            "id": "q-mock-7",
            "topic": "DBMS Normalization",
            "question_text": "A database relation contains attributes {StudentID, CourseID, Grade, InstructorOffice}. If InstructorOffice depends solely on CourseID (a partial dependency of the composite primary key), which normal form is violated?",
            "options": [
                {"id": "A", "text": "1NF"},
                {"id": "B", "text": "2NF"},
                {"id": "C", "text": "3NF"},
                {"id": "D", "text": "BCNF"}
            ],
            "correct_option": "B",
            "explanation": "Second Normal Form (2NF) requires that no non-prime attribute is functionally dependent on a proper subset of any candidate key."
        },
        {
            "id": "q-mock-8",
            "topic": "Operating Systems Synchronization",
            "question_text": "What condition occurs when two or more concurrent processes wait indefinitely for an event that can be caused only by one of the waiting processes?",
            "options": [
                {"id": "A", "text": "Deadlock"},
                {"id": "B", "text": "Livelock"},
                {"id": "C", "text": "Starvation"},
                {"id": "D", "text": "Race Condition"}
            ],
            "correct_option": "A",
            "explanation": "Deadlock is the permanent blocking of a set of processes that compete for system resources."
        },
        {
            "id": "q-mock-9",
            "topic": "Computer Networks Protocols",
            "question_text": "What is the primary function of the Address Resolution Protocol (ARP) in local IPv4 networks?",
            "options": [
                {"id": "A", "text": "Map an IP address to a physical MAC address"},
                {"id": "B", "text": "Map a domain name to an IP address"},
                {"id": "C", "text": "Encrypt HTTP payload packets"},
                {"id": "D", "text": "Route packets across autonomous systems"}
            ],
            "correct_option": "A",
            "explanation": "ARP maps a 32-bit logical IPv4 address to a 48-bit physical MAC address on a local Ethernet segment."
        },
        {
            "id": "q-mock-10",
            "topic": "Web Security",
            "question_text": "Which security measure protects web applications against Cross-Site Request Forgery (CSRF)?",
            "options": [
                {"id": "A", "text": "Using Anti-CSRF Synchronizer Tokens and SameSite cookie attributes"},
                {"id": "B", "text": "Removing all password requirements"},
                {"id": "C", "text": "Disabling HTTPS encryption"},
                {"id": "D", "text": "Using GET requests for database delete operations"}
            ],
            "correct_option": "A",
            "explanation": "Unique secret per-session tokens and SameSite cookie flags prevent unauthorized third-party sites from submitting forged requests."
        }
    ]
}

# In-memory store for active and finalized attempts
# In production, mirrored to public.assessment_attempts
DATABASE_ATTEMPTS: Dict[str, Dict[str, Any]] = {}

def get_test_questions_safe(test_id: str) -> List[Dict[str, Any]]:
    """Returns questions for test_id WITHOUT the correct_option answer key."""
    questions = QUESTION_BANK.get(test_id, [])
    safe_list = []
    for q in questions:
        safe_list.append({
            "id": q["id"],
            "topic": q["topic"],
            "question_text": q["question_text"],
            "options": q["options"]
        })
    return safe_list

def start_assessment_attempt(student_id: str, test_id: str) -> Dict[str, Any]:
    """Initializes a new assessment attempt with authoritative deadlines."""
    test_def = TEST_CATALOG.get(test_id)
    if not test_def:
        raise ValueError(f"Test '{test_id}' not found.")

    questions = QUESTION_BANK.get(test_id, [])
    if not questions:
        raise ValueError(f"No questions found for test '{test_id}'.")

    now = datetime.now(timezone.utc)
    duration = timedelta(minutes=test_def["duration_minutes"])
    expires_at = now + duration

    attempt_id = f"att-{uuid.uuid4().hex[:8]}"
    attempt = {
        "id": attempt_id,
        "student_id": student_id,
        "test_id": test_id,
        "test_title": test_def["title"],
        "category": test_def["category"],
        "sub_category": test_def["sub_category"],
        "duration_minutes": test_def["duration_minutes"],
        "total_questions": len(questions),
        "total_marks": test_def["total_marks"],
        "marks_per_question": test_def["marks_per_question"],
        "negative_marks": test_def["negative_marks"],
        "status": "in_progress",
        "started_at": now.isoformat(),
        "expires_at": expires_at.isoformat(),
        "submitted_at": None,
        "submission_reason": None,
        "answers": {},  # question_id -> {"selected_option": "A", "marked_for_review": False}
        "integrity_events": [],
        "violation_count": 0,
        "penalty_applied": False,
        "raw_score": None,
        "adjusted_score": None,
        "percentage_score": None,
        "correct_count": 0,
        "incorrect_count": 0,
        "unanswered_count": len(questions),
        "time_spent_seconds": 0
    }

    DATABASE_ATTEMPTS[attempt_id] = attempt

    return {
        "attempt": attempt,
        "questions": get_test_questions_safe(test_id)
    }

def get_assessment_attempt(attempt_id: str, student_id: str) -> Dict[str, Any]:
    """Retrieves an existing attempt, enforcing ownership check."""
    attempt = DATABASE_ATTEMPTS.get(attempt_id)
    if not attempt:
        raise ValueError("Assessment attempt not found.")

    if attempt["student_id"] != student_id:
        raise PermissionError("Access denied: You do not own this assessment attempt.")

    # Check if authoritative deadline has passed while in_progress
    if attempt["status"] == "in_progress":
        now = datetime.now(timezone.utc)
        expires_at = datetime.fromisoformat(attempt["expires_at"])
        if now > expires_at:
            # Auto-submit due to timer expiration
            finalize_assessment_attempt(
                attempt_id=attempt_id,
                student_id=student_id,
                reason="auto_submitted_timeout"
            )
            attempt = DATABASE_ATTEMPTS[attempt_id]

    is_completed = attempt["status"] in ("completed", "auto_submitted_timeout", "terminated_by_integrity")
    
    # If completed, include full questions with explanations; otherwise safe questions
    if is_completed:
        questions_payload = QUESTION_BANK.get(attempt["test_id"], [])
    else:
        questions_payload = get_test_questions_safe(attempt["test_id"])

    return {
        "attempt": attempt,
        "questions": questions_payload
    }

def save_assessment_answer(
    attempt_id: str,
    student_id: str,
    question_id: str,
    selected_option: Optional[str],
    marked_for_review: bool = False
) -> Dict[str, Any]:
    """Idempotently saves an answer for an active attempt."""
    attempt = DATABASE_ATTEMPTS.get(attempt_id)
    if not attempt:
        raise ValueError("Assessment attempt not found.")

    if attempt["student_id"] != student_id:
        raise PermissionError("Access denied.")

    if attempt["status"] != "in_progress":
        raise ValueError("Cannot update answers: Attempt has already been finalized.")

    # Save answer state
    attempt["answers"][question_id] = {
        "selected_option": selected_option,
        "marked_for_review": marked_for_review,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

    return {"success": True, "saved_answer": attempt["answers"][question_id]}

def log_integrity_event(
    attempt_id: str,
    student_id: str,
    event_type: str,
    details: Optional[str] = None
) -> Dict[str, Any]:
    """
    Logs an integrity event with deduplication throttling.
    Enforces the policy:
    1st violation: Warning 1 of 3
    2nd violation: Warning 2 of 3
    3rd violation: Warning 3 of 3
    4th violation: Auto-submit with 5-percentage-point penalty deduction.
    """
    attempt = DATABASE_ATTEMPTS.get(attempt_id)
    if not attempt:
        raise ValueError("Assessment attempt not found.")

    if attempt["student_id"] != student_id:
        raise PermissionError("Access denied.")

    if attempt["status"] != "in_progress":
        return {
            "attempt_active": False,
            "violation_count": attempt["violation_count"],
            "warning_message": "Attempt already finalized."
        }

    now = datetime.now(timezone.utc)

    # Throttling check: ignore duplicate events of same type within 2 seconds
    if attempt["integrity_events"]:
        last_event = attempt["integrity_events"][-1]
        last_time = datetime.fromisoformat(last_event["timestamp"])
        if (now - last_time).total_seconds() < 2.0 and last_event["event_type"] == event_type:
            return {
                "attempt_active": True,
                "violation_count": attempt["violation_count"],
                "warning_level": min(attempt["violation_count"], 3),
                "is_throttled": True
            }

    attempt["violation_count"] += 1
    v_count = attempt["violation_count"]

    event_record = {
        "id": f"evt-{uuid.uuid4().hex[:6]}",
        "event_type": event_type,
        "violation_number": v_count,
        "timestamp": now.isoformat(),
        "details": details or f"Detected {event_type} during active assessment."
    }
    attempt["integrity_events"].append(event_record)

    # Policy enforcement
    if v_count == 1:
        warning_msg = "Integrity Warning (1 of 3): Tab change or full-screen exit detected. Please keep the assessment tab active."
        auto_submitted = False
    elif v_count == 2:
        warning_msg = "Integrity Warning (2 of 3): Second focus violation detected. An official Proctor audit trail is being recorded."
        auto_submitted = False
    elif v_count == 3:
        warning_msg = "Integrity Warning (3 of 3): Final warning! One more violation will immediately terminate your assessment with a 5-percentage-point penalty."
        auto_submitted = False
    else:
        # 4th violation or higher: Automatic submission with 5% deduction
        warning_msg = "Assessment Terminated: 4th integrity violation detected. Your attempt has been automatically submitted with a 5-percentage-point penalty deduction."
        finalize_assessment_attempt(
            attempt_id=attempt_id,
            student_id=student_id,
            reason="terminated_by_integrity",
            force_penalty=True
        )
        auto_submitted = True

    return {
        "attempt_active": not auto_submitted,
        "violation_count": v_count,
        "warning_level": min(v_count, 3),
        "warning_message": warning_msg,
        "auto_submitted": auto_submitted
    }

def finalize_assessment_attempt(
    attempt_id: str,
    student_id: str,
    reason: str = "manual_submission",
    force_penalty: bool = False
) -> Dict[str, Any]:
    """
    Finalizes an assessment attempt exactly once on the backend.
    Calculates raw score from answer keys and stored answers.
    Applies 5-percentage-point deduction penalty if violations >= 4 (penalty applied once only, floor 0).
    Rejects subsequent modifications.
    """
    attempt = DATABASE_ATTEMPTS.get(attempt_id)
    if not attempt:
        raise ValueError("Assessment attempt not found.")

    if attempt["student_id"] != student_id:
        raise PermissionError("Access denied.")

    # Idempotent return if already finalized
    if attempt["status"] != "in_progress":
        return attempt

    now = datetime.now(timezone.utc)
    started_at = datetime.fromisoformat(attempt["started_at"])
    time_spent = int((now - started_at).total_seconds())
    max_duration_sec = attempt["duration_minutes"] * 60
    attempt["time_spent_seconds"] = min(time_spent, max_duration_sec)

    questions = QUESTION_BANK.get(attempt["test_id"], [])
    answer_keys = {q["id"]: q["correct_option"] for q in questions}

    marks_per_q = attempt["marks_per_question"]
    negative_marks = attempt["negative_marks"]

    correct_cnt = 0
    incorrect_cnt = 0
    unanswered_cnt = 0
    raw_score = 0.0

    user_answers = attempt["answers"]

    for q in questions:
        qid = q["id"]
        correct_ans = answer_keys.get(qid)
        ans_record = user_answers.get(qid)
        selected = ans_record.get("selected_option") if ans_record else None

        if not selected:
            unanswered_cnt += 1
            if ans_record:
                ans_record["is_correct"] = None
        elif selected == correct_ans:
            correct_cnt += 1
            raw_score += marks_per_q
            if ans_record:
                ans_record["is_correct"] = True
        else:
            incorrect_cnt += 1
            raw_score -= negative_marks
            if ans_record:
                ans_record["is_correct"] = False

    raw_score = round(raw_score, 2)
    total_marks = attempt["total_marks"]
    raw_pct = round(max(0.0, (raw_score / total_marks) * 100.0), 1)

    # Apply 5 percentage points penalty if violations >= 4 or force_penalty
    apply_penalty = force_penalty or (attempt["violation_count"] >= 4)
    if apply_penalty:
        adjusted_pct = max(0.0, round(raw_pct - 5.0, 1))
        attempt["penalty_applied"] = True
    else:
        adjusted_pct = raw_pct
        attempt["penalty_applied"] = False

    attempt["status"] = (
        "terminated_by_integrity" if reason == "terminated_by_integrity"
        else "auto_submitted_timeout" if reason == "auto_submitted_timeout"
        else "completed"
    )
    attempt["submitted_at"] = now.isoformat()
    attempt["submission_reason"] = reason
    attempt["correct_count"] = correct_cnt
    attempt["incorrect_count"] = incorrect_cnt
    attempt["unanswered_count"] = unanswered_cnt
    attempt["raw_score"] = raw_score
    attempt["percentage_score"] = raw_pct
    attempt["adjusted_score"] = adjusted_pct

    return attempt

def get_student_assessment_progress(student_id: str) -> Dict[str, Any]:
    """
    Computes progress metrics across all completed assessment attempts for the student.
    Never fabricates historical data.
    """
    attempts = [
        att for att in DATABASE_ATTEMPTS.values()
        if att["student_id"] == student_id and att["status"] in ("completed", "auto_submitted_timeout", "terminated_by_integrity")
    ]

    # Sort chronologically
    attempts.sort(key=lambda a: a.get("submitted_at") or a.get("started_at"))

    if not attempts:
        return {
            "tests_completed": 0,
            "latest_score": None,
            "highest_score": None,
            "average_score": None,
            "accuracy_percentage": None,
            "total_questions_attempted": 0,
            "total_correct": 0,
            "total_time_spent_minutes": 0,
            "topic_strengths": [],
            "topic_weaknesses": [],
            "score_trend": [],
            "attempt_history": [],
            "recommended_next_test": TEST_CATALOG["apt-quant-01"]
        }

    total_attempts = len(attempts)
    scores = [a["adjusted_score"] for a in attempts if a["adjusted_score"] is not None]
    latest_score = scores[-1] if scores else None
    highest_score = max(scores) if scores else None
    average_score = round(sum(scores) / len(scores), 1) if scores else None

    total_correct = sum(a.get("correct_count", 0) for a in attempts)
    total_incorrect = sum(a.get("incorrect_count", 0) for a in attempts)
    total_attempted = total_correct + total_incorrect
    accuracy = round((total_correct / total_attempted) * 100.0, 1) if total_attempted > 0 else 0.0

    total_seconds = sum(a.get("time_spent_seconds", 0) for a in attempts)

    # Topic performance aggregation
    topic_stats: Dict[str, Dict[str, int]] = {}
    for att in attempts:
        t_id = att["test_id"]
        questions = QUESTION_BANK.get(t_id, [])
        for q in questions:
            t = q["topic"]
            if t not in topic_stats:
                topic_stats[t] = {"correct": 0, "total": 0}
            ans = att.get("answers", {}).get(q["id"])
            if ans and ans.get("selected_option"):
                topic_stats[t]["total"] += 1
                if ans.get("is_correct"):
                    topic_stats[t]["correct"] += 1

    strengths = []
    weaknesses = []
    for t, stat in topic_stats.items():
        if stat["total"] >= 2:
            acc = (stat["correct"] / stat["total"]) * 100.0
            if acc >= 75.0:
                strengths.append({"topic": t, "accuracy": round(acc, 1), "attempted": stat["total"]})
            elif acc <= 50.0:
                weaknesses.append({"topic": t, "accuracy": round(acc, 1), "attempted": stat["total"]})

    # Recommendation
    if weaknesses:
        rec_topic = weaknesses[0]["topic"].lower()
        rec_test = next(
            (t for t in TEST_CATALOG.values() if rec_topic in t["description"].lower() or rec_topic in t["title"].lower()),
            TEST_CATALOG["tech-dsa-01"]
        )
    else:
        rec_test = TEST_CATALOG["mock-full-01"]

    score_trend = [
        {
            "attempt_index": idx + 1,
            "test_title": a["test_title"],
            "raw_score": a["raw_score"],
            "percentage": a["adjusted_score"],
            "penalty_applied": a["penalty_applied"],
            "date": (a.get("submitted_at") or a.get("started_at"))[:10]
        }
        for idx, a in enumerate(attempts)
    ]

    return {
        "tests_completed": total_attempts,
        "latest_score": latest_score,
        "highest_score": highest_score,
        "average_score": average_score,
        "accuracy_percentage": accuracy,
        "total_questions_attempted": total_attempted,
        "total_correct": total_correct,
        "total_time_spent_minutes": round(total_seconds / 60.0, 1),
        "topic_strengths": strengths,
        "topic_weaknesses": weaknesses,
        "score_trend": score_trend,
        "attempt_history": attempts[::-1],  # newest first
        "recommended_next_test": rec_test
    }
