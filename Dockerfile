# Build stage
FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /app
COPY pom.xml .
COPY backend/ ./backend
RUN mvn clean package -DskipTests

# Runtime stage
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=builder /app/backend/target/excelapp-*.jar app.jar
EXPOSE 8080
CMD ["java", "-jar", "app.jar"]
