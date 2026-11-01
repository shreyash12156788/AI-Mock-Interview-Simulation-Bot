#include "app_config.hpp"
#include "api_error.hpp"
#include "interview_service.hpp"

#include <algorithm>
#include <cctype>
#include <cmath>
#include <sstream>
#include <string>
#include <vector>

namespace interview
{
namespace
{
std::string required_string(const nlohmann::json& input, const char* field,
                            std::size_t maximum_length)
{
    if (!input.is_object() || !input.contains(field) || !input[field].is_string())
    {
        throw ApiError(400, "invalid_input", std::string(field) + " is required.");
    }

    auto value = input[field].get<std::string>();
    const auto first = value.find_first_not_of(" \t\r\n");
    if (first == std::string::npos)
    {
        throw ApiError(400, "invalid_input", std::string(field) + " is required.");
    }
    value = value.substr(first, value.find_last_not_of(" \t\r\n") - first + 1);
    const auto characters = static_cast<std::size_t>(std::count_if(
        value.begin(), value.end(),
        [](unsigned char ch) { return (ch & 0xc0) != 0x80; }));
    if (characters > maximum_length)
    {
        throw ApiError(400, "invalid_input",
                       std::string(field) + " exceeds the allowed length.");
    }
    return value;
}

std::string normalize(const std::string& value)
{
    std::string result;
    result.reserve(value.size());
    bool previous_space = true;
    for (const unsigned char ch : value)
    {
        if (std::isalnum(ch) != 0)
        {
            result.push_back(static_cast<char>(std::tolower(ch)));
            previous_space = false;
        }
        else if (!previous_space)
        {
            result.push_back(' ');
            previous_space = true;
        }
    }
    if (!result.empty() && result.back() == ' ')
    {
        result.pop_back();
    }
    return result;
}

bool contains_phrase(const std::string& normalized_answer, const std::string& phrase)
{
    const auto normalized_phrase = normalize(phrase);
    if (normalized_phrase.empty())
    {
        return false;
    }
    const auto padded_answer = " " + normalized_answer + " ";
    const auto padded_phrase = " " + normalized_phrase + " ";
    return padded_answer.find(padded_phrase) != std::string::npos;
}

std::vector<std::string> split_words(const std::string& normalized)
{
    std::istringstream input(normalized);
    std::vector<std::string> words;
    std::string word;
    while (input >> word)
    {
        words.push_back(std::move(word));
    }
    return words;
}

bool valid_category(const std::string& category)
{
    static const std::vector<std::string> categories = {
        "C++", "Java", "Python", "Data Structures", "DBMS",
        "Operating Systems", "Computer Networks", "OOP",
        "HR Interview", "General Technical Interview"
    };
    return std::find(categories.begin(), categories.end(), category) != categories.end();
}

int minimum_words(const std::string& difficulty)
{
    if (difficulty == "Easy")
    {
        return 12;
    }
    if (difficulty == "Hard")
    {
        return 30;
    }
    return 20;
}
}

nlohmann::json InterviewService::evaluate_answer(const nlohmann::json& input) const
{
    const auto question_text = required_string(input, "question", 1200);
    const auto category = required_string(input, "category", 40);
    const auto topic = required_string(input, "topic", 120);
    const auto difficulty = required_string(input, "difficulty", 20);
    const auto answer = required_string(input, "answer", maximum_answer_characters);
    if (!valid_category(category))
    {
        throw ApiError(400, "invalid_input", "category is not supported.");
    }
    if (difficulty != "Easy" && difficulty != "Medium" && difficulty != "Hard")
    {
        throw ApiError(400, "invalid_input", "difficulty must be Easy, Medium, or Hard.");
    }
    if (!input.contains("criteria") || !input["criteria"].is_array() ||
        input["criteria"].empty() || input["criteria"].size() > 6)
    {
        throw ApiError(400, "invalid_input",
                       "criteria must contain between one and six concepts.");
    }

    const auto normalized_answer = normalize(answer);
    const auto words = split_words(normalized_answer);
    const auto required_word_count = minimum_words(difficulty);
    const auto answer_is_long_enough =
        words.size() >= static_cast<std::size_t>(required_word_count);

    std::vector<std::string> matched_concepts;
    std::vector<std::string> missing_concepts;
    std::vector<std::string> matched_keywords;
    std::vector<std::string> missing_keywords;
    std::vector<std::string> contradictions;
    std::size_t total_keyword_groups = 0;
    std::size_t matched_keyword_groups = 0;

    for (const auto& criterion : input["criteria"])
    {
        if (!criterion.is_object())
        {
            throw ApiError(400, "invalid_input", "Each criterion must be an object.");
        }
        const auto concept_name = required_string(criterion, "concept", 100);
        if (!criterion.contains("keywordGroups") ||
            !criterion["keywordGroups"].is_array() ||
            criterion["keywordGroups"].empty() ||
            criterion["keywordGroups"].size() > 8)
        {
            throw ApiError(400, "invalid_input",
                           "Each criterion must include keyword groups.");
        }

        std::size_t matched_groups_for_concept = 0;
        for (const auto& group : criterion["keywordGroups"])
        {
            ++total_keyword_groups;
            if (!group.is_array() || group.empty() || group.size() > 8)
            {
                throw ApiError(400, "invalid_input",
                               "Each keyword group must contain valid alternatives.");
            }
            std::vector<std::string> alternatives;
            for (const auto& item : group)
            {
                if (!item.is_string() || item.get<std::string>().empty() ||
                    item.get<std::string>().size() > 100)
                {
                    throw ApiError(400, "invalid_input",
                                   "A keyword alternative is invalid.");
                }
                alternatives.push_back(item.get<std::string>());
            }
            const auto match = std::find_if(
                alternatives.begin(), alternatives.end(),
                [&](const std::string& phrase) {
                    return contains_phrase(normalized_answer, phrase);
                });
            if (match == alternatives.end())
            {
                missing_keywords.push_back(alternatives.front());
            }
            else
            {
                ++matched_groups_for_concept;
                ++matched_keyword_groups;
                matched_keywords.push_back(*match);
            }
        }

        const auto enough_concept_evidence =
            matched_groups_for_concept * 2 >= criterion["keywordGroups"].size();
        if (enough_concept_evidence)
        {
            matched_concepts.push_back(concept_name);
        }
        else
        {
            missing_concepts.push_back(concept_name);
        }

        if (criterion.contains("contradictions"))
        {
            if (!criterion["contradictions"].is_array() ||
                criterion["contradictions"].size() > 8)
            {
                throw ApiError(400, "invalid_input",
                               "Contradiction checks must be an array.");
            }
            for (const auto& phrase : criterion["contradictions"])
            {
                if (!phrase.is_string() || phrase.get<std::string>().empty())
                {
                    throw ApiError(400, "invalid_input",
                                   "A contradiction check is invalid.");
                }
                if (contains_phrase(normalized_answer, phrase.get<std::string>()))
                {
                    contradictions.push_back(phrase.get<std::string>());
                }
            }
        }
    }

    const auto concept_coverage =
        static_cast<double>(matched_concepts.size()) / input["criteria"].size();
    const auto keyword_coverage =
        total_keyword_groups == 0
            ? 0.0
            : static_cast<double>(matched_keyword_groups) / total_keyword_groups;
    const auto explanation_score = !answer_is_long_enough
                                      ? 0.0
                                  : words.size() >=
                                            static_cast<std::size_t>(required_word_count * 2)
                                      ? 2.0
                                      : 1.0;
    const auto contradiction_penalty =
        std::min(3.0, static_cast<double>(contradictions.size()) * 2.5);
    const auto overall = std::clamp(
        concept_coverage * 6.0 + keyword_coverage * 2.0 + explanation_score -
            contradiction_penalty,
        0.0, 10.0);
    const auto relevance = std::clamp(keyword_coverage * 10.0, 0.0, 10.0);
    const auto completeness = std::clamp(
        (answer_is_long_enough ? 5.0 : 0.0) +
            std::min(5.0, static_cast<double>(words.size()) /
                              static_cast<double>(required_word_count) * 2.5),
        0.0, 10.0);
    const auto technical_depth = std::clamp(concept_coverage * 10.0, 0.0, 10.0);
    const auto communication = std::clamp(
        answer_is_long_enough ? 8.0 + (words.size() >=
                                              static_cast<std::size_t>(required_word_count * 2)
                                          ? 2.0
                                          : 0.0)
                              : words.size() >= 5 ? 5.0 : 2.0,
        0.0, 10.0);

    std::string suggestion;
    if (!missing_concepts.empty())
    {
        suggestion = "Strengthen your explanation by covering: ";
        for (std::size_t index = 0; index < missing_concepts.size(); ++index)
        {
            if (index != 0)
            {
                suggestion += ", ";
            }
            suggestion += missing_concepts[index];
        }
        suggestion += ".";
    }
    else if (!missing_keywords.empty())
    {
        suggestion = "Add more detail about " + missing_keywords.front() +
                     " to make your explanation more complete.";
    }
    else
    {
        suggestion = "Your key concepts are covered. Add a concrete example and explain "
                     "the trade-offs to make the answer even stronger.";
    }
    if (!answer_is_long_enough)
    {
        suggestion += " Expand your answer to at least " +
                      std::to_string(required_word_count) + " words.";
    }
    if (!contradictions.empty())
    {
        suggestion += " Review the conflicting statement: " + contradictions.front() + ".";
    }

    const auto feedback = overall >= 8.0
                              ? "Strong rule-based match: your answer covers the key concepts."
                          : overall >= 5.0
                              ? "Developing answer: some important concepts need more support."
                              : "Keep building your answer: several expected ideas are missing.";
    return {
        {"question", question_text},
        {"category", category},
        {"topic", topic},
        {"overallScore", std::round(overall * 10.0) / 10.0},
        {"correctness", std::round(overall * 10.0) / 10.0},
        {"relevance", std::round(relevance * 10.0) / 10.0},
        {"technicalDepth", std::round(technical_depth * 10.0) / 10.0},
        {"completeness", std::round(completeness * 10.0) / 10.0},
        {"communication", std::round(communication * 10.0) / 10.0},
        {"matchedConcepts", matched_concepts},
        {"missingConcepts", missing_concepts},
        {"matchedKeywords", matched_keywords},
        {"missingKeywords", missing_keywords},
        {"contradictions", contradictions},
        {"wordCount", words.size()},
        {"minimumWords", required_word_count},
        {"improvementSuggestion", suggestion},
        {"feedback", feedback},
        {"assessmentType", "rule-based"}
    };
}
}
