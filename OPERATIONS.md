# Operations Guide

This guide is for system administrators, software engineers, and testers wishing to run the entire CDP on their local machine. For cloud deployments, see our [public](https://github.com/Neosofia/infrastructure/blob/main/public-cloud/RUNBOOK.md) or [private](https://github.com/Neosofia/infrastructure/blob/main/private-cloud/RUNBOOK.md) cloud runbooks.

## Prerequisites for local operations

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

## Local env setup

Before starting a service at set of environment variables must be generated in order to operate correctly. Every service will have their own operations guide to walk you through the process of generating them. For example, the authentication service has a very lengthy [setup process](https://github.com/Neosofia/authentication/blob/main/OPERATIONS.md) due to the nature of how the service securely operates.

When finished, you should have a set of environment variable files that look like this:
```
.authentication.env
.notification.env
.authorization.env
...
```

A service may also include helper scripts inside its docker image to simplify setup. For example, the authentication service provides a bootstrap container that generates its env file for you:

```bash
docker compose -f docker-compose.dev.yml run --rm authentication-bootstrap > .authentication.env
```

This runs `scripts/setup-env.sh` inside the auth image, generates a local auth environment file, and writes it to the CDP repo root. The top-level compose file then mounts `.authentication.env` into the auth container as `/app/.env`.

After generation, fill in these required values manually in `.authentication.env`:

- `WORKOS_CLIENT_ID`
- `WORKOS_API_KEY`


## Start the Full Stack

Once you have generated all your environment variables, you can bring up the whole platform locally with this command:

```bash
docker compose -f docker-compose.dev.yml up -d
```

Then access the platform by starting at localhost:5173 for the UI, and whatever other services your stack exposes (e.g. Authentication at localhost:8014).





