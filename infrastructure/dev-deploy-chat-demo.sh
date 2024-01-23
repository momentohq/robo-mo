set -ex

export AWS_PROFILE=michael

# Domain to use for the mvi service
export MVI_CHAT_DOMAIN=${MVI_CHAT_DOMAIN:-developer-michael-dev.preprod.a.momentohq.com}

# Chat domain will re-use the service domain if not otherwise specified.
# Use MVI_CHAT_DOMAIN to specify a different domain.
# Use MVI_CHAT_SUBDOMAIN to specify a different subdomain, otherwise "mo-chat" will be used.

if [ -z "$OPENAI_API_KEY" ]; then
    echo "OPENAI_API_KEY is not set"
    exit 1
fi

if [ -z "$MOMENTO_API_KEY" ]; then
    echo "MOMENTO_API_KEY is not set"
    exit 1
fi

npm run cdk deploy robo-mo -- \
    --parameters mvi-chat-demo:OpenAiApiKey=$OPENAI_API_KEY \
    --parameters mvi-chat-demo:MomentoApiKey=$MOMENTO_API_KEY
