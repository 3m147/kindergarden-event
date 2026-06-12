# Oracle Compute backend deployment

This directory runs the Spring Boot backend behind Caddy HTTPS.

## Server requirements

- Ubuntu Oracle Compute instance
- Ingress ports `22`, `80`, and `443` open
- Docker Engine with the Compose plugin
- Compute public IP added to the Autonomous Database ACL

## First deployment

```bash
git clone https://github.com/3m147/kindergarden-event.git
cd kindergarden-event/deploy/oracle-compute
cp .env.example .env
nano .env
mkdir wallet
```

Extract the Autonomous Database instance wallet into `wallet`, then run:

```bash
chmod +x deploy.sh
./deploy.sh
```

Verify:

```bash
docker compose logs backend --tail=100
curl https://${API_DOMAIN}/actuator/health
```

## Updates

```bash
git pull
cd deploy/oracle-compute
./deploy.sh
```
