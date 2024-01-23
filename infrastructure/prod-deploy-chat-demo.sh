export MVI_CHAT_DOMAIN="mochat.momentohq.com"
export MVI_CHAT_SUBDOMAIN="web"

# Note the below script requires
# OPENAI_API_KEY to be set in the environment
# MOMENTO_API_KEY to be set in the environment
# and uses AWS_PROFILE=dev

source ./dev-deploy-chat-demo.sh
