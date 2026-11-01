FROM ubuntu:24.04 AS build

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    cmake \
    g++ \
    git \
    libasio-dev \
    make \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY CMakeLists.txt ./
COPY backend ./backend
COPY config ./config
COPY include ./include
COPY src ./src
COPY frontend ./frontend
COPY tests ./tests
RUN cmake -S . -B build -DCMAKE_BUILD_TYPE=Release \
    && cmake --build build --parallel 2

FROM ubuntu:24.04 AS runtime
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --no-create-home --shell /usr/sbin/nologin app
WORKDIR /app
COPY --from=build /app/build/adaptive-interview /usr/local/bin/adaptive-interview
COPY --from=build /app/frontend ./frontend
ENV PORT=10000
EXPOSE 10000
USER app
CMD ["/usr/local/bin/adaptive-interview"]
