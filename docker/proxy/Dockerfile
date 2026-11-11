ARG JDK_VERSION=17

# Stage 0, based on Amazon Corretto, to compile the proxy and its project dependency
FROM --platform=$BUILDPLATFORM amazoncorretto:${JDK_VERSION}.0.21 AS build-proxy-middleware
WORKDIR /usr/src
COPY gradlew settings.gradle build.gradle .java-version /usr/src/
COPY gradle /usr/src/gradle
COPY sitmun-common /usr/src/sitmun-common
COPY sitmun-proxy /usr/src/sitmun-proxy
# The wrapper calls xargs. Corretto 17.0.21 on Amazon Linux 2023 does not ship findutils.
RUN dnf install -y findutils && dnf clean all
RUN --mount=type=cache,target=/root/.gradle-proxy \
    GRADLE_USER_HOME=/root/.gradle-proxy ./gradlew --no-daemon :sitmun-proxy:build \
    -x :sitmun-proxy:check

# Stage 1, based on Amazon Corretto, to have only the compiled app
FROM amazoncorretto:17.0.21@sha256:b505ecf1fd737d85c0fd3930b8ab3ed0cb560326809aacc838b3938a9bc84c4b
LABEL org.opencontainers.image.source=https://github.com/sitmun/sitmun
LABEL org.opencontainers.image.licenses=EUPL-1.2
LABEL org.opencontainers.image.description="SITMUN proxy"
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75"
COPY --from=build-proxy-middleware /usr/src/sitmun-proxy/build/libs/*.jar /usr/src/proxy.jar
WORKDIR /usr/src
ENTRYPOINT ["java", "-jar", "proxy.jar"]
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 CMD curl --fail http://localhost:8080/actuator/health || exit 1
