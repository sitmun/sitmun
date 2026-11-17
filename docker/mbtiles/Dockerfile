ARG JDK_VERSION=17

FROM --platform=$BUILDPLATFORM amazoncorretto:${JDK_VERSION}.0.21 AS build-mbtiles
WORKDIR /usr/src
COPY gradlew settings.gradle build.gradle .java-version /usr/src/
COPY gradle /usr/src/gradle
COPY sitmun-addons/sitmun-mbtiles /usr/src/sitmun-addons/sitmun-mbtiles
# The wrapper calls xargs. Corretto 17.0.21 on Amazon Linux 2023 does not ship findutils.
RUN dnf install -y findutils && dnf clean all
RUN --mount=type=cache,target=/root/.gradle-mbtiles \
    GRADLE_USER_HOME=/root/.gradle-mbtiles ./gradlew --no-daemon :sitmun-mbtiles:build \
    -x :sitmun-mbtiles:check

FROM amazoncorretto:27.0.0@sha256:f58d4541b3aab1fd90493bbcb0ea2448ff57469d044dbb463e22fdecc2eee25c
LABEL org.opencontainers.image.source=https://github.com/sitmun/sitmun
LABEL org.opencontainers.image.licenses=EUPL-1.2
LABEL org.opencontainers.image.description="SITMUN MBTiles"
COPY --from=build-mbtiles /usr/src/sitmun-addons/sitmun-mbtiles/build/libs/*.jar /usr/src/mbtiles.jar
WORKDIR /usr/src
VOLUME ["/tmp/mbtiles"]
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75"
ENV JAVA_OPTS="-Xms256m -Xmx512m"
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar mbtiles.jar"]
HEALTHCHECK --interval=30s --timeout=30s --start-period=20s --retries=3 \
  CMD curl --fail http://localhost:8080/actuator/health || exit 1
