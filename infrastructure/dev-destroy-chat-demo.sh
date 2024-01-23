set -ex

export AWS_PROFILE=dev

# Domain to use for the mvi service
export MVI_CHAT_DOMAIN=${MVI_CHAT_DOMAIN:-developer-michael-dev.preprod.a.momentohq.com}

# Chat domain will re-use the service domain if not otherwise specified.
# Use MVI_CHAT_DOMAIN to specify a different domain.
# Use MVI_CHAT_SUBDOMAIN to specify a different subdomain, otherwise "mo-chat" will be used.

npm run cdk destroy robo-mo
