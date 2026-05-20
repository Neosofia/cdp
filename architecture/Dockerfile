# Build Structurizr from source so we can run the open source server version.
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /tmp/structurizr
RUN git clone --depth 1 https://github.com/structurizr/structurizr.git . \
    && ./mvnw -DexcludedGroups=IntegrationTest -Dmaven.test.skip=true package

FROM eclipse-temurin:21-jdk-jammy
COPY --chmod=0777 structurizr /usr/local/structurizr
COPY adrs /usr/local/adrs
COPY --from=build /tmp/structurizr/structurizr-application/target/structurizr-*.war /usr/local/structurizr.war

WORKDIR /usr/local/structurizr
EXPOSE 8080
ENTRYPOINT ["java", "-Dserver.port=8080", "--enable-native-access=ALL-UNNAMED", "-jar", "/usr/local/structurizr.war"]
CMD ["server"]
