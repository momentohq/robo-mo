set -ex

export AWS_PROFILE=dev

echo "

Deploying chat demos. Please make sure you have done an 'aws sso login' before running this
script, or you will get an error stating 'Unable to resolve AWS account to use'.

"

# Domain to use for the mvi service
export MVI_CHAT_DOMAIN=${MVI_CHAT_DOMAIN:-developer-michael-dev.preprod.a.momentohq.com}

# Chat domain will re-use the service domain if not otherwise specified.
# Use MVI_CHAT_DOMAIN to specify a different domain.
# Use STREAMLIT_DEMO_SUBDOMAIN to specify a different subdomain, otherwise "mo-chat" will be used.
# Use LANGSERVE_DEMO_SUBDOMAIN to specify a different subdomain, otherwise "robomo-ls" will be used.

# Steps for deploying the discord bot
cd ../robomo-discord-bot/ecs-code
npm i
tsc # need to compile the ts file because the Dockerfile expects a dist/index.js file
cd ../../infrastructure
npm i


npm run cdk deploy robo-mo
