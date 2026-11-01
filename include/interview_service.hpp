#pragma once

#include <nlohmann/json.hpp>

#include <string>

namespace interview
{
class InterviewService
{
public:
    nlohmann::json evaluate_answer(const nlohmann::json& input) const;
};
}
