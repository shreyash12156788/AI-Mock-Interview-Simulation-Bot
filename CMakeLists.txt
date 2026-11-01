cmake_minimum_required(VERSION 3.20)
project(adaptive_interview_challenge VERSION 1.0.0 LANGUAGES CXX)

include(FetchContent)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
include(CTest)
set(CROW_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
set(CROW_BUILD_TESTS OFF CACHE BOOL "" FORCE)
set(CROW_BUILD_FUZZER OFF CACHE BOOL "" FORCE)
set(CROW_INSTALL OFF CACHE BOOL "" FORCE)

find_package(Threads REQUIRED)
find_path(ASIO_SYSTEM_INCLUDE_DIR asio.hpp)

if(ASIO_SYSTEM_INCLUDE_DIR)
    set(ASIO_INCLUDE_DIR "${ASIO_SYSTEM_INCLUDE_DIR}")
else()
    FetchContent_Declare(
        asio
        GIT_REPOSITORY https://github.com/chriskohlhoff/asio.git
        GIT_TAG asio-1-30-2
        GIT_SHALLOW TRUE
    )
    FetchContent_GetProperties(asio)
    if(NOT asio_POPULATED)
        FetchContent_Populate(asio)
    endif()
    set(ASIO_INCLUDE_DIR "${asio_SOURCE_DIR}/asio/include")
endif()

FetchContent_Declare(
    crow
    GIT_REPOSITORY https://github.com/CrowCpp/Crow.git
    GIT_TAG v1.2.1
    GIT_SHALLOW TRUE
)
FetchContent_MakeAvailable(crow)

FetchContent_Declare(
    nlohmann_json
    GIT_REPOSITORY https://github.com/nlohmann/json.git
    GIT_TAG v3.12.0
    GIT_SHALLOW TRUE
)
FetchContent_MakeAvailable(nlohmann_json)

add_subdirectory(backend)
