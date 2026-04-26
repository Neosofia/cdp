
    # ---------------------------------------------------------------------------
    # Deployment model
    # Included into workspace.dsl inside the model { } block.
    #
    # Single "earth" environment — one source of truth for all infrastructure.
    # Two views slice it: DevDeployment (Proxmox on-prem) and ProdDeployment (AWS).
    #
    # Shared SaaS:  GitHub (Actions + GHCR), WorkOS
    # Dev-only:     Cloudflare DNS, NetBird relay, Proxmox VE (CT 110 / 114 / 120)
    # Prod-only:    AWS (CloudFront, API GW, VPC / ECS Fargate, RDS, Secrets Manager)
    # ---------------------------------------------------------------------------

    deploymentEnvironment "earth" {

        # -----------------------------------------------------------------
        # Shared SaaS
        # -----------------------------------------------------------------

        github = deploymentNode "GitHub" "github.com SaaS" "SaaS" {
            tags "GitHub"
            actions = deploymentNode "GitHub Actions" "CI/CD pipeline" "GitHub Actions" {
                tags "GitHubActions"
                ci = infrastructureNode "authentication-ci" "pytest unit + integration tests on PRs and main; weekly Trivy CVE scan" "GHA Workflow" {
                    tags "Workflow"
                }
                build = infrastructureNode "authentication-build-push" "Build, test, scan, push to GHCR on authentication/* tag. Planned: manual approval gate for prod." "GHA Workflow" {
                    tags "Workflow"
                }
                deploy = infrastructureNode "authentication-deploy-dev" "Pulls tagged image, retags :latest, runs docker compose up on CT 120 via self-hosted runner" "GHA Workflow" {
                    tags "Workflow"
                }
            }
            ghcr = infrastructureNode "GHCR" "GitHub Container Registry — ghcr.io/byoung/cdp/authentication" "OCI Registry" {
                tags "GitHubRegistry"
            }
        }

        wosNode = deploymentNode "WorkOS" "External identity provider" "SaaS" {
            tags "SaaSNode"
            wosSso = infrastructureNode "WorkOS SSO" "OAuth2 PKCE flows and SSO session management" "WorkOS" {
                tags "SaaSService"
            }
        }

        # -----------------------------------------------------------------
        # Dev ingress
        # -----------------------------------------------------------------

        cloudflare = deploymentNode "Cloudflare" "DNS and DDoS protection" "Cloudflare" {
            tags "Edge"
            dns = infrastructureNode "auth.dev.cdp.neosofia.tech" "CNAME -> NetBird peer IP. Proxied for DDoS protection." "Cloudflare DNS" {
                tags "Proxy"
            }
        }

        netbird = deploymentNode "NetBird" "WireGuard mesh VPN and reverse-proxy relay" "NetBird SaaS" {
            tags "SaaSNode" "NetBirdNode"
            nbRelay = infrastructureNode "NetBird relay" "Routes encrypted traffic from Cloudflare peer IP to CT 110 NB client" "NetBird" {
                tags "NetBirdService"
            }
        }

        # -----------------------------------------------------------------
        # Dev compute — Proxmox VE on-prem
        # -----------------------------------------------------------------

        pve = deploymentNode "Proxmox VE" "On-prem bare-metal hypervisor" "Proxmox VE 9.x" {
            tags "OnPrem"

            ct110 = deploymentNode "CT 110 - netbird" "Edge LXC: NetBird client. Manually provisioned — no IaC script yet." "Debian 13" {
                tags "LXC"
                nbClient = infrastructureNode "NetBird client" "Joins the NetBird mesh; receives ingress from relay" "NetBird" {
                    tags "Proxy" "NetBirdService"
                }
            }

            ct114 = deploymentNode "CT 114 - portainer" "Ops visibility LXC  1 vCPU / 512 MiB" "Debian 13 / Docker CE" {
                tags "LXC"
                portainer = infrastructureNode "Portainer CE" "Container ops console. :9443 / :9000" "portainer/portainer-ce:2.39.1" {
                    tags "OpsNode"
                }
            }

            ct120 = deploymentNode "CT 120 - cdp-auth-dev" "Authentication LXC  2 vCPU / 4 GiB / 10.0.0.120" "Debian 13 / Docker CE" {
                tags "LXC"
                compose = deploymentNode "Docker Compose: authentication" "Service and its database" "Docker Compose" {
                    tags "ComposeStack"
                    authSvcDev = containerInstance authService {
                        properties {
                            "image" "ghcr.io/byoung/cdp/authentication:latest"
                            "pull_policy" "never (pre-pulled by deploy workflow)"
                            "port" "8000"
                        }
                    }
                    postgres = infrastructureNode "cdp-auth-postgres" "Auth database — bind-mount at /var/lib/cdp-auth/postgres" "postgres:16" {
                        tags "Database"
                    }
                    localstack = infrastructureNode "cdp-auth-localstack" "LocalStack Secrets Manager — seeds cdp/authentication/dev/env bundle via init hook" "localstack/localstack:4" {
                        tags "SecretsNode"
                    }
                }
                portainerAgent = infrastructureNode "Portainer Agent" "Exposes Docker socket to CT 114 on :9001" "portainer/agent:latest" {
                    tags "OpsNode"
                }
            }
        }

        # -----------------------------------------------------------------
        # Prod compute — AWS (planned)
        # -----------------------------------------------------------------

        aws = deploymentNode "AWS" "Amazon Web Services" "Cloud" {
            tags "Cloud"

            cfEdge = deploymentNode "CloudFront" "Global CDN and TLS termination" "AWS CloudFront" {
                tags "AwsCdn"
                cfDist = infrastructureNode "auth.cdp.example.com" "ACM certificate. WAF OWASP Top 10 rules." "CloudFront Distribution" {
                    tags "AwsCdnNode"
                }
            }

            apigw = deploymentNode "API Gateway" "Managed API entry point with WAF" "AWS API Gateway v2 + AWS WAF" {
                tags "AwsGateway"
                gwInst = containerInstance apiGateway
            }

            vpc = deploymentNode "VPC" "Isolated private network" "AWS VPC" {
                tags "AwsVpc"

                publicSubnet = deploymentNode "Public Subnet" "Hosts NAT Gateway; no application workloads" "AWS Subnet" {
                    tags "AwsVpc"
                    natGw = infrastructureNode "NAT Gateway" "Provides outbound internet access for private subnet resources (GHCR pulls, WorkOS API calls)" "AWS NAT Gateway" {
                        tags "AwsGateway"
                    }
                }

                privateSubnet = deploymentNode "Private Subnet" "No inbound internet routes; only reachable via API GW and NAT GW" "AWS Subnet" {
                    tags "AwsVpc"

                    fargate = deploymentNode "ECS Fargate" "Serverless container runtime - no EC2 to patch" "AWS ECS Fargate" {
                        tags "AwsCompute"
                        authSvcProd = containerInstance authService {
                            properties {
                                "image" "ghcr.io/byoung/cdp/authentication:{tag}"
                                "cpu" "512"
                                "memory" "1024 MiB"
                            }
                        }
                    }

                    rds = deploymentNode "RDS" "Multi-AZ, encrypted at rest" "AWS RDS PostgreSQL 16" {
                        tags "AwsDatabase"
                        db = infrastructureNode "auth-db" "Authentication service database" "PostgreSQL 16" {
                            tags "Database"
                        }
                    }
                }
            }

            secretsMgr = deploymentNode "Secrets Manager" "Secure secrets at rest" "AWS Secrets Manager" {
                tags "AwsService"
                secretsInst = infrastructureNode "auth service secrets" "DB credentials, WorkOS client secret, JWT RS256 private key" "AWS Secrets Manager" {
                    tags "AwsSecurityNode"
                }
            }
        }

        # --- CI/CD relationships (shared — visible in both views) ---
        ci      -> build     "gates"
        build   -> ghcr      "pushes image"
        build   -> deploy    "triggers on same tag"

        # --- Dev relationships ---
        deploy         -> authSvcDev     "docker compose up --force-recreate via self-hosted runner"
        ghcr           -> authSvcDev     "image pulled by deploy workflow before compose up"
        dns            -> nbRelay        "CNAME → NetBird peer IP (proxied)"
        nbRelay        -> nbClient       "routes via WireGuard mesh"
        nbClient       -> authSvcDev     "routes to :8000"
        portainer      -> portainerAgent "manages via agent :9001"
        portainerAgent -> authSvcDev     "monitors"
        authSvcDev     -> postgres       "reads/writes"
        authSvcDev     -> localstack     "fetches secret bundle at startup (AWS_ENDPOINT_URL)"
        localstack     -> postgres       "init hook probes DB availability"
        wosSso         -> authSvcDev     "OAuth2 callback"

        # --- Prod relationships ---
        cfDist         -> gwInst         "routes to API GW"
        authSvcProd    -> db             "reads/writes (private subnet)"
        authSvcProd    -> secretsInst    "reads secrets at startup (VPC endpoint)"
        authSvcProd    -> natGw          "outbound internet traffic"
        natGw          -> ghcr           "pulls image on deploy"
        natGw          -> wosSso         "WorkOS API calls (OAuth2 initiation)"
        wosSso         -> authSvcProd    "OAuth2 callback (inbound via CF → API GW)"
    }


