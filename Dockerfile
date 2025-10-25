# Этап 1: сборка проекта
FROM maven:3.9.9-eclipse-temurin-21-alpine as builder
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# Этап 2: запуск приложения
FROM openjdk:21-jdk-slim
WORKDIR /app
COPY --from=builder /app/target/chat-platform-0.0.1-SNAPSHOT.jar app.jar
COPY src/main/resources/db/migration /app/db/migration
ENTRYPOINT ["java", "-jar", "app.jar"]
