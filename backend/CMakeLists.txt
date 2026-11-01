add_executable(adaptive-interview
    ${PROJECT_SOURCE_DIR}/src/main.cpp
    ${PROJECT_SOURCE_DIR}/src/interview_service.cpp
)

set_target_properties(adaptive-interview PROPERTIES
    RUNTIME_OUTPUT_DIRECTORY "${PROJECT_BINARY_DIR}"
)
foreach(configuration IN LISTS CMAKE_CONFIGURATION_TYPES)
    string(TOUPPER "${configuration}" configuration_upper)
    set_target_properties(adaptive-interview PROPERTIES
        "RUNTIME_OUTPUT_DIRECTORY_${configuration_upper}" "${PROJECT_BINARY_DIR}"
    )
endforeach()

target_include_directories(adaptive-interview PRIVATE
    ${PROJECT_SOURCE_DIR}/include
    ${PROJECT_SOURCE_DIR}/config
)
target_link_libraries(adaptive-interview PRIVATE
    Crow::Crow
    nlohmann_json::nlohmann_json
    Threads::Threads
)
target_compile_definitions(adaptive-interview PRIVATE
    INTERVIEW_FRONTEND_DIR="${PROJECT_SOURCE_DIR}/frontend"
)

if(WIN32)
    target_link_libraries(adaptive-interview PRIVATE ws2_32 mswsock)
endif()

if(MSVC)
    target_compile_options(adaptive-interview PRIVATE /W4 /permissive-)
else()
    target_compile_options(adaptive-interview PRIVATE -Wall -Wextra -Wpedantic)
endif()

install(TARGETS adaptive-interview RUNTIME DESTINATION bin)

if(BUILD_TESTING)
    add_executable(interview-evaluation-tests
        ${PROJECT_SOURCE_DIR}/tests/evaluation_tests.cpp
        ${PROJECT_SOURCE_DIR}/src/interview_service.cpp
    )
    target_include_directories(interview-evaluation-tests PRIVATE
        ${PROJECT_SOURCE_DIR}/include
        ${PROJECT_SOURCE_DIR}/config
    )
    target_link_libraries(interview-evaluation-tests PRIVATE
        nlohmann_json::nlohmann_json
    )
    add_test(NAME interview-evaluation COMMAND interview-evaluation-tests)
endif()
