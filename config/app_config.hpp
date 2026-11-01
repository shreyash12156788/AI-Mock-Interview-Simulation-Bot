#pragma once

#include <cstddef>
#include <string>

namespace interview
{
inline constexpr int default_port = 8080;
inline constexpr int maximum_questions = 6;
inline constexpr std::size_t maximum_request_bytes = 32 * 1024;
inline constexpr std::size_t maximum_answer_characters = 6000;
}
