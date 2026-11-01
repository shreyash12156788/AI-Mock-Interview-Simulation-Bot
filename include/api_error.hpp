#pragma once

#include <stdexcept>
#include <string>
#include <utility>

namespace interview
{
class ApiError : public std::runtime_error
{
public:
    ApiError(int status_code, std::string error_code, std::string message) :
        std::runtime_error(std::move(message)),
        status(status_code),
        code(std::move(error_code))
    {
    }

    int status;
    std::string code;
};
}
