FROM structurizr/structurizr

# Copy the repository workspace into the Structurizr runtime dir.
COPY --chmod=0777 structurizr /usr/local/structurizr
COPY adrs /usr/local/adrs
COPY --chmod=0755 run-structurizr.sh /usr/local/bin/run-structurizr.sh

WORKDIR /usr/local/structurizr
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/run-structurizr.sh"]
CMD ["local"]
