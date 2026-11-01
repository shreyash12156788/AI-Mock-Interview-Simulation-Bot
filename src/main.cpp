#include "app_config.hpp"
#include "api_error.hpp"
#include "interview_service.hpp"

#include <crow.h>
#include <nlohmann/json.hpp>

#include <cstdlib>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <iterator>
#include <stdexcept>
#include <string>
#include <unordered_map>

namespace
{
class HttpError : public std::runtime_error
{
public:
    HttpError(int status_code, std::string error_code, std::string message) :
        std::runtime_error(std::move(message)),
        status(status_code),
        code(std::move(error_code))
    {
    }

    int status;
    std::string code;
};

int configured_port()
{
    const char* value = std::getenv("PORT");
    if (value == nullptr || *value == '\0')
    {
        return interview::default_port;
    }
    try
    {
        std::size_t consumed = 0;
        const auto port = std::stoi(value, &consumed);
        if (consumed != std::string(value).size() || port < 1 || port > 65535)
        {
            throw std::invalid_argument("port out of range");
        }
        return port;
    }
    catch (const std::exception&)
    {
        throw std::runtime_error("PORT must be a valid TCP port between 1 and 65535.");
    }
}

crow::response json_response(int status, const nlohmann::json& body)
{
    crow::response response(status, body.dump());
    response.set_header("Content-Type", "application/json; charset=utf-8");
    response.set_header("Cache-Control", "no-store");
    response.set_header("X-Content-Type-Options", "nosniff");
    response.set_header("X-Frame-Options", "DENY");
    response.set_header("Referrer-Policy", "strict-origin-when-cross-origin");
    response.set_header("Content-Security-Policy",
                        "default-src 'self'; style-src 'self' 'unsafe-inline'; "
                        "script-src 'self'; img-src 'self' data:; connect-src 'self'; "
                        "object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
    return response;
}

bool is_allowed_frontend_origin(const crow::request& request)
{
    const char* configured_origin = std::getenv("FRONTEND_ORIGIN");
    return configured_origin != nullptr && *configured_origin != '\0' &&
           request.get_header_value("Origin") == configured_origin;
}

void add_cors_headers(const crow::request& request, crow::response& response)
{
    response.add_header("Vary", "Origin");
    if (is_allowed_frontend_origin(request))
    {
        response.add_header("Access-Control-Allow-Origin",
                            request.get_header_value("Origin"));
    }
}

struct CorsMiddleware
{
    struct context
    {};

    void before_handle(crow::request&, crow::response&, context&)
    {}

    void after_handle(crow::request& request, crow::response& response, context&)
    {
        if (request.url == "/api/health" || request.url == "/api/evaluate")
        {
            add_cors_headers(request, response);
        }
    }
};

template<typename Operation>
crow::response handle_request(Operation&& operation)
{
    try
    {
        return json_response(200, operation());
    }
    catch (const HttpError& error)
    {
        return json_response(error.status,
                             {{"error", {{"code", error.code}, {"message", error.what()}}}});
    }
    catch (const interview::ApiError& error)
    {
        return json_response(error.status,
                             {{"error", {{"code", error.code}, {"message", error.what()}}}});
    }
    catch (const nlohmann::json::exception&)
    {
        return json_response(
            400, {{"error", {{"code", "invalid_json"},
                             {"message", "The request body must be valid JSON."}}}});
    }
    catch (const std::exception& error)
    {
        std::cerr << "Request failed: " << error.what() << '\n';
        return json_response(
            500, {{"error", {{"code", "internal_error"},
                             {"message", "The request could not be completed."}}}});
    }
}

nlohmann::json request_json(const crow::request& request)
{
    if (request.body.size() > interview::maximum_request_bytes)
    {
        throw HttpError(413, "request_too_large",
                        "The request body exceeds the allowed size.");
    }
    const auto body = nlohmann::json::parse(request.body, nullptr, false);
    if (body.is_discarded() || !body.is_object())
    {
        throw HttpError(400, "invalid_json",
                        "The request body must be a JSON object.");
    }
    return body;
}

std::string read_frontend_file(const std::string& name)
{
    static const std::unordered_map<std::string, std::string> allowed_files = {
        {"app.js", "application/javascript; charset=utf-8"},
        {"config.js", "application/javascript; charset=utf-8"},
        {"styles.css", "text/css; charset=utf-8"}
    };
    const auto found = allowed_files.find(name);
    if (found == allowed_files.end())
    {
        throw HttpError(404, "not_found",
                        "The requested resource could not be found.");
    }
    std::ifstream file(std::filesystem::path(INTERVIEW_FRONTEND_DIR) / name,
                       std::ios::binary);
    if (!file)
    {
        throw std::runtime_error("Frontend asset could not be opened.");
    }
    return {std::istreambuf_iterator<char>(file),
            std::istreambuf_iterator<char>()};
}

crow::response static_response(const std::string& content, const std::string& type)
{
    crow::response response(200, content);
    response.set_header("Content-Type", type);
    response.set_header("Cache-Control", "no-cache");
    response.set_header("X-Content-Type-Options", "nosniff");
    response.set_header("X-Frame-Options", "DENY");
    response.set_header("Referrer-Policy", "strict-origin-when-cross-origin");
    response.set_header("Content-Security-Policy",
                        "default-src 'self'; style-src 'self' 'unsafe-inline'; "
                        "script-src 'self'; img-src 'self' data:; connect-src 'self'; "
                        "object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
    return response;
}

crow::response parse_error_response(const HttpError& error)
{
    return json_response(error.status,
                         {{"error", {{"code", error.code}, {"message", error.what()}}}});
}
}

int main()
{
    try
    {
        interview::InterviewService service;
        crow::App<CorsMiddleware> app;

        CROW_ROUTE(app, "/")([] {
            std::ifstream file(std::filesystem::path(INTERVIEW_FRONTEND_DIR) /
                                   "index.html",
                               std::ios::binary);
            if (!file)
            {
                return crow::response(500,
                                      "The application interface is unavailable.");
            }
            return static_response(
                {std::istreambuf_iterator<char>(file),
                 std::istreambuf_iterator<char>()},
                "text/html; charset=utf-8");
        });

        CROW_ROUTE(app, "/assets/<string>")
        ([](const std::string& name) {
            try
            {
                const auto content = read_frontend_file(name);
                const auto type = name == "styles.css"
                                      ? "text/css; charset=utf-8"
                                      : "application/javascript; charset=utf-8";
                return static_response(content, type);
            }
            catch (const HttpError& error)
            {
                return parse_error_response(error);
            }
            catch (const std::exception&)
            {
                return crow::response(500, "The application asset is unavailable.");
            }
        });

        CROW_ROUTE(app, "/api/health")([] {
            return json_response(
                200, {{"status", "ok"}, {"evaluator", "rule-based"},
                      {"externalAi", false}});
        });

        CROW_ROUTE(app, "/api/evaluate").methods(crow::HTTPMethod::Post)
        ([&service](const crow::request& request) {
            return handle_request([&] {
                return service.evaluate_answer(request_json(request));
            });
        });

        app.port(configured_port()).bindaddr("0.0.0.0").multithreaded().run();
        return 0;
    }
    catch (const std::exception& error)
    {
        std::cerr << "Startup failed: " << error.what() << '\n';
        return 1;
    }
}
