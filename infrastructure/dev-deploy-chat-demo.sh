set -ex

export AWS_PROFILE=michael

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


npm run cdk deploy robo-mo
