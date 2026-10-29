ARG JDK_VERSION=17
ARG JDK_TAG=0.17
ARG ALPINE_TAG=3.22

# Stage 0, based on Amazon Corretto, to compile the shared library and the backend
FROM amazoncorretto:${JDK_VERSION}.${JDK_TAG} AS build-backend-core
WORKDIR /usr/src
COPY gradlew settings.gradle build.gradle gradle.properties .java-version /usr/src/
COPY gradle /usr/src/gradle
COPY sitmun-common /usr/src/sitmun-common
COPY sitmun-backend /usr/src/sitmun-backend
RUN --mount=type=cache,target=/root/.gradle \
    GRADLE_USER_HOME=/root/.gradle ./gradlew --no-daemon :sitmun-backend:build -x check

# Stage 1, based on Amazon Corretto, to have only the compiled app, ready for production with Nginx
FROM amazoncorretto:${JDK_VERSION}.${JDK_TAG}-alpine${ALPINE_TAG}
RUN apk add --no-cache curl
COPY --from=build-backend-core /usr/src/sitmun-backend/build/libs/*.jar /usr/src/sitmun.jar
WORKDIR /usr/src
ENTRYPOINT ["java", "-jar", "sitmun.jar"]
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 CMD curl --fail http://localhost:8080/api/dashboard/health || exit 1
