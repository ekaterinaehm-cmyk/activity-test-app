#!/usr/bin/env python3
"""Build data/questions.json and the Russian locale file from the source Excel.

This is the canonical builder. The TypeScript variant in parse-excel.ts is a thin
wrapper around the `xlsx` npm package and produces the same JSON shape; use either.
"""

import json
import sys
from pathlib import Path

# --- Question shape (id, type, options/items/scale, etc.) is hand-tuned per question.
# The Excel layout is non-trivial (merged cells, ranking widths) so we map it manually
# rather than over-engineering an auto-inference pass.

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
LOCALES_DIR = ROOT / "locales"

QUESTIONS = [
    {"id": "q1", "number": 1, "type": "color_test", "required": True,
     "externalUrl": "https://psytests.org/luscher/8color.html"},

    {"id": "q2", "number": 2, "type": "free_text", "required": True},
    {"id": "q3", "number": 3, "type": "free_text", "required": True},
    {"id": "q4", "number": 4, "type": "free_text", "required": False},
    {"id": "q5", "number": 5, "type": "free_text_long", "required": True},
    {"id": "q6", "number": 6, "type": "free_text", "required": True},
    {"id": "q7", "number": 7, "type": "free_text_long", "required": False},
    {"id": "q8", "number": 8, "type": "free_text", "required": False},
    {"id": "q9", "number": 9, "type": "free_text", "required": False},
    {"id": "q10", "number": 10, "type": "free_text_long", "required": False},
    {"id": "q11", "number": 11, "type": "free_text", "required": False},
    {"id": "q12", "number": 12, "type": "free_text", "required": True},
    {"id": "q13", "number": 13, "type": "free_text", "required": False},
    {"id": "q14", "number": 14, "type": "free_text", "required": False},

    {"id": "q15", "number": 15, "type": "industry_block", "required": True,
     "subjects": ["self", "mother", "father"],
     "industries": [f"i{i+1}" for i in range(20)]},

    {"id": "q16", "number": 16, "type": "single_select", "required": True,
     "options": ["numbers", "letters"]},

    {"id": "q17", "number": 17, "type": "ranking", "required": True,
     "scale": {"min": 1, "max": 8},
     "options": ["people", "documents", "food", "machines", "computers", "metal", "plastic", "wood_leather"]},

    {"id": "q18", "number": 18, "type": "ranking", "required": True,
     "scale": {"min": 1, "max": 4},
     "options": ["water", "air", "earth", "fire"]},

    {"id": "q19", "number": 19, "type": "iq_matrix", "required": False,
     "items": ["words", "numbers", "graphics"],
     "options": ["harder", "easier"]},

    {"id": "q20", "number": 20, "type": "single_select", "required": True,
     "options": ["set_by_management", "your_own", "set_by_you_for_others"]},

    {"id": "q21", "number": 21, "type": "single_select", "required": True,
     "options": ["fixed_salary", "percent_of_projects"]},

    {"id": "q22", "number": 22, "type": "single_select", "required": True,
     "options": ["in_team", "separately_common_cause", "freelance", "managing_others"]},

    {"id": "q23", "number": 23, "type": "single_select", "required": True,
     "options": ["as_needed", "morning", "afternoon", "classic_9_to_6"]},

    {"id": "q24", "number": 24, "type": "single_select", "required": True,
     "options": ["near_home", "city_center", "mobile_in_city", "business_trips"]},

    {"id": "q25", "number": 25, "type": "ranking", "required": True,
     "scale": {"min": 1, "max": 7},
     "options": ["sales", "marketing", "finance_law", "service", "logistics", "production", "management"]},

    {"id": "q26", "number": 26, "type": "single_select", "required": True,
     "options": ["warn_ahead", "late_with_excuses", "always_on_time"]},

    {"id": "q27", "number": 27, "type": "multi_select", "required": True,
     "options": ["envy_them", "admire_them", "quietly_upset", "loudly_indignant", "angry_at_boss", "i_do_something_wrong"]},

    {"id": "q28", "number": 28, "type": "single_select", "required": True,
     "options": ["by_results", "by_time_spent", "by_difficulty"]},

    {"id": "q29", "number": 29, "type": "ranking", "required": True,
     "scale": {"min": 1, "max": 7},
     "options": ["spend_on_earning", "always_learning", "family_and_friends", "free_time_for_self", "time_priceless", "i_get_bored_like_action", "time_flies_fast"]},

    {"id": "q30", "number": 30, "type": "single_select", "required": True,
     "options": ["talk_to_boss_privately", "open_discussion_with_team", "just_do_what_needed"]},

    {"id": "q31", "number": 31, "type": "ranking", "required": True,
     "scale": {"min": 1, "max": 5},
     "options": ["for_money", "help_people", "develop_world", "strengthen_country", "raise_status"]},

    {"id": "q32", "number": 32, "type": "multi_select", "required": True,
     "options": ["for_family", "for_personal_wants", "for_big_purchase", "pay_loans"]},

    {"id": "q33", "number": 33, "type": "single_select", "required": True,
     "options": ["near_parents", "own_family_far_from_parents", "travel_change_home_is_family"]},

    {"id": "q34", "number": 34, "type": "single_select", "required": True,
     "options": ["suburban_house", "city_apartment"]},

    {"id": "q35", "number": 35, "type": "single_select", "required": True,
     "options": ["rent", "own"]},

    {"id": "q36", "number": 36, "type": "single_select", "required": True,
     "options": ["build_career_in_one_org", "try_industries_become_pro", "learn_and_clone_business", "my_own_idea_path_niche"]},

    {"id": "q37", "number": 37, "type": "ranking", "required": True,
     "scale": {"min": 1, "max": 3},
     "options": ["income_source", "inevitability", "paid_hobby"]},

    {"id": "q38", "number": 38, "type": "single_select", "required": True,
     "options": ["discuss_with_boss_and_colleagues", "discuss_with_family_friends_online", "not_important_just_work"]},

    {"id": "q39", "number": 39, "type": "ranking", "required": True,
     "scale": {"min": 1, "max": 5},
     "options": ["money", "not_dusty", "field_industry", "what_to_do_specifically", "growth_prospects"]},

    {"id": "q40", "number": 40, "type": "single_select", "required": True,
     "options": ["stylish_trendy", "comfortable", "suits_me", "uniform", "like_friends_colleagues"]},

    {"id": "q41", "number": 41, "type": "single_select", "required": True,
     "options": ["if_we_became_friends", "part_of_corporate_culture", "no_enough_at_work"]},

    {"id": "q42", "number": 42, "type": "ranking", "required": True,
     "scale": {"min": 1, "max": 4},
     "options": ["with_family", "with_friends", "study_hobby_own_business", "sport_fresh_air"]},

    {"id": "q43", "number": 43, "type": "multi_select", "required": True,
     "options": ["dont_like_studying_like_knowing", "i_like_studying", "study_what_helps_earn", "grades_motivate", "grades_dont_matter", "live_and_learn_forever"]},

    {"id": "q44", "number": 44, "type": "single_select", "required": True,
     "options": ["afraid_of_it", "very_responsible", "should_match_pay"]},

    {"id": "q45", "number": 45, "type": "single_select", "required": True,
     "options": ["father_and_teacher", "want_to_be_boss", "structural_unit"]},

    {"id": "q46", "number": 46, "type": "ranking", "required": True,
     "scale": {"min": 1, "max": 7},
     "options": ["health", "prosperity", "wisdom", "power_strength", "happy_family", "thriving_country", "peace_love_on_earth"]},

    {"id": "q47", "number": 47, "type": "ranking", "required": True,
     "scale": {"min": 1, "max": 3},
     "options": ["write", "call", "meet_in_person"]},

    {"id": "q48", "number": 48, "type": "ranking", "required": True,
     "scale": {"min": 1, "max": 6},
     "options": ["with_1_3_close_people", "in_solitude", "in_large_group", "in_small_group", "center_of_attention", "be_leader"]},

    {"id": "q49", "number": 49, "type": "single_select", "required": True,
     "options": ["best_friends", "geek_cyborg", "as_needed", "dislike"]},

    {"id": "q50", "number": 50, "type": "free_text_long", "required": True},

    {"id": "q51", "number": 51, "type": "likert_group", "required": True,
     "scale": {"min": 1, "max": 10},
     "items": ["parents_relationship", "personal_life", "overall_life_satisfaction"]},

    {"id": "q52", "number": 52, "type": "ranking", "required": True,
     "scale": {"min": 1, "max": 3},
     "options": ["start_from_zero_others_continue", "take_existing_and_polish", "do_everything_start_to_finish"]},

    {"id": "q53", "number": 53, "type": "multi_select", "required": True,
     "options": ["creative_person", "reliable_performer", "doer_achiever", "techie", "humanitarian", "master_craftsman"]},

    {"id": "q54", "number": 54, "type": "color_test", "required": True,
     "externalUrl": "https://psytests.org/luscher/8color.html"},
]

# --- Build promptKey references and write JSON --------------------------------------
def main():
    DATA_DIR.mkdir(exist_ok=True)
    LOCALES_DIR.mkdir(exist_ok=True)
    out = []
    for q in QUESTIONS:
        item = dict(q)
        item["promptKey"] = f"q{q['number']}.prompt"
        out.append(item)
    target = DATA_DIR / "questions.json"
    target.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {target} ({len(out)} questions)")

if __name__ == "__main__":
    sys.exit(main() or 0)
