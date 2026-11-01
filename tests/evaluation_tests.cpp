#include "api_error.hpp"
#include "interview_service.hpp"

#include <iostream>
#include <stdexcept>

namespace
{
void expect(bool condition, const char* message)
{
    if (!condition)
    {
        throw std::runtime_error(message);
    }
}

nlohmann::json hash_question(const std::string& answer,
                             const std::string& difficulty = "Medium")
{
    const auto criteria = nlohmann::json::array({
        nlohmann::json{
            {"concept", "Hash tables"},
            {"keywordGroups",
             nlohmann::json::array({
                 nlohmann::json::array({"hash table", "hash map"}),
                 nlohmann::json::array({"hash function", "hash"})
             })},
            {"contradictions",
             nlohmann::json::array({"hash tables never have collisions"})}
        }
    });
    return {
        {"question", "Explain how a hash table handles collisions."},
        {"category", "Data Structures"},
        {"topic", "Search and priority"},
        {"difficulty", difficulty},
        {"criteria", criteria},
        {"answer", answer}
    };
}
}

int main()
{
    interview::InterviewService evaluator;
    const auto complete_answer =
        "A hash table applies a hash function to map each key into a bucket. "
        "Different keys can have a collision, which can be handled with chaining "
        "or open addressing. I would consider the load factor, memory cost, and "
        "lookup patterns, then test realistic data and edge cases to check performance.";
    const auto complete = evaluator.evaluate_answer(hash_question(complete_answer));
    expect(complete["overallScore"].get<double>() == 10.0,
           "A complete answer should score 10.");
    expect(complete["matchedConcepts"].size() == 1,
           "The expected concept should match.");
    expect(complete["missingConcepts"].empty(),
           "A complete answer should have no missing concepts.");
    expect(complete["assessmentType"] == "rule-based",
           "The response should identify its rule-based assessment.");

    const auto incomplete = evaluator.evaluate_answer(hash_question("I would use a table."));
    expect(incomplete["overallScore"].get<double>() < 5.0,
           "A short, incomplete answer should score below 5.");
    expect(!incomplete["missingConcepts"].empty(),
           "The incomplete answer should identify missing concepts.");
    expect(incomplete["minimumWords"] == 20,
           "Medium difficulty should require 20 words.");

    const auto easy = evaluator.evaluate_answer(hash_question(
        "A hash table uses a hash function for keys, and collisions can happen.", "Easy"));
    expect(easy["minimumWords"] == 12, "Easy difficulty should require 12 words.");

    auto contradictory = hash_question(
        std::string(complete_answer) + " Hash tables never have collisions.");
    const auto contradiction_result = evaluator.evaluate_answer(contradictory);
    expect(contradiction_result["contradictions"].size() == 1,
           "Contradictory claims should be detected.");
    expect(contradiction_result["overallScore"].get<double>() < 10.0,
           "A contradiction should reduce the score.");

    bool invalid_category_rejected = false;
    try
    {
        auto invalid = hash_question(complete_answer);
        invalid["category"] = "Unknown";
        evaluator.evaluate_answer(invalid);
    }
    catch (const interview::ApiError& error)
    {
        invalid_category_rejected = error.status == 400;
    }
    expect(invalid_category_rejected, "Unsupported categories should be rejected.");

    bool malformed_criteria_rejected = false;
    try
    {
        auto invalid = hash_question(complete_answer);
        invalid["criteria"] = nlohmann::json::array();
        evaluator.evaluate_answer(invalid);
    }
    catch (const interview::ApiError& error)
    {
        malformed_criteria_rejected = error.status == 400;
    }
    expect(malformed_criteria_rejected, "Missing criteria should be rejected.");

    std::cout << "Rule-based evaluator tests passed.\n";
    return 0;
}
