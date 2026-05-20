FROM structurizr/structurizr

# Copy the repository workspace into the Structurizr runtime dir.
COPY --chmod=0777 structurizr /usr/local/structurizr
COPY adrs /usr/local/adrs

WORKDIR /usr/local/structurizr
EXPOSE 8080
ENTRYPOINT ["java", "-Dserver.port=8080", "--enable-native-access=ALL-UNNAMED", "-jar", "/usr/local/structurizr.war"]
CMD ["local"]
