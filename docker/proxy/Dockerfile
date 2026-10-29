ARG JDK_VERSION=17
ARG JDK_TAG=0.17
ARG ALPINE_TAG=3.22

# Stage 0, based on Amazon Corretto, to compile the proxy and its project dependency
FROM amazoncorretto:${JDK_VERSION}.${JDK_TAG} AS build-proxy-middleware
WORKDIR /usr/src
COPY gradlew settings.gradle build.gradle .java-version /usr/src/
COPY gradle /usr/src/gradle
COPY sitmun-common /usr/src/sitmun-common
COPY sitmun-proxy /usr/src/sitmun-proxy
RUN --mount=type=cache,target=/root/.gradle-proxy \
    GRADLE_USER_HOME=/root/.gradle-proxy ./gradlew --no-daemon :sitmun-proxy:build \
    -x :sitmun-proxy:check

# Stage 1, based on Amazon Corretto, to have only the compiled app
FROM amazoncorretto:${JDK_VERSION}.${JDK_TAG}-alpine${ALPINE_TAG}
RUN apk add --no-cache curl
COPY --from=build-proxy-middleware /usr/src/sitmun-proxy/build/libs/*.jar /usr/src/proxy.jar
WORKDIR /usr/src
ENTRYPOINT ["java", "-jar", "proxy.jar"]
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 CMD curl --fail http://localhost:8080/actuator/health || exit 1
