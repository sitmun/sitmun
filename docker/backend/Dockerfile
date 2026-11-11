ARG JDK_VERSION=17

# Stage 0, based on Amazon Corretto, to compile the shared library and the backend
FROM --platform=$BUILDPLATFORM amazoncorretto:${JDK_VERSION}.0.21 AS build-backend-core
WORKDIR /usr/src
COPY gradlew settings.gradle build.gradle gradle.properties .java-version /usr/src/
COPY gradle /usr/src/gradle
COPY sitmun-common /usr/src/sitmun-common
COPY sitmun-backend /usr/src/sitmun-backend
# The wrapper calls xargs. Corretto 17.0.21 on Amazon Linux 2023 does not ship findutils.
RUN dnf install -y findutils && dnf clean all
RUN --mount=type=cache,target=/root/.gradle \
    GRADLE_USER_HOME=/root/.gradle ./gradlew --no-daemon :sitmun-backend:build -x check

# Stage 1, based on Amazon Corretto, to have only the compiled app, ready for production with Nginx
FROM amazoncorretto:17.0.21@sha256:b505ecf1fd737d85c0fd3930b8ab3ed0cb560326809aacc838b3938a9bc84c4b
LABEL org.opencontainers.image.source=https://github.com/sitmun/sitmun
LABEL org.opencontainers.image.licenses=EUPL-1.2
LABEL org.opencontainers.image.description="SITMUN backend"
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75"
COPY --from=build-backend-core /usr/src/sitmun-backend/build/libs/*.jar /usr/src/sitmun.jar
WORKDIR /usr/src
ENTRYPOINT ["java", "-jar", "sitmun.jar"]
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 CMD curl --fail http://localhost:8080/api/dashboard/health || exit 1
