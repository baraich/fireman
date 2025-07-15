FROM node:21-slim

# Install curl
RUN apt-get update && apt-get install -y curl && apt-get clean && rm -rf /var/lib/apt/lists/*

COPY compile_app.sh /compile_app.sh
RUN chmod +x /compile_app.sh

# Install dependencies
WORKDIR /home/user/next

RUN npx --yes create-next-app@15.3.3 . --yes

RUN npx --yes shadcn@2.6.3 init --yes -b neutral --force
RUN npx --yes shadcn@2.6.3 add --all --yes

RUN mv /home/user/next/* /home/user/ && rm -rf /home/user/next