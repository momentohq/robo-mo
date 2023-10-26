import os
from typing import Optional

import boto3  # type: ignore[import]
from botocore.exceptions import ClientError  # type: ignore[import]


def get_secret_from_secrets_manager(secret_name: str, region_name: str = "us-west-2") -> str:
    # Create a Secrets Manager client
    client = boto3.Session().client(service_name="secretsmanager", region_name=region_name)

    get_secret_value_response: dict[str, str] | None = None

    try:
        get_secret_value_response = client.get_secret_value(SecretId=secret_name)
    except ClientError as e:
        if e.response["Error"]["Code"] == "DecryptionFailureException":
            raise e
        elif e.response["Error"]["Code"] == "InternalServiceErrorException":
            raise e
        elif e.response["Error"]["Code"] == "InvalidParameterException":
            raise e
        elif e.response["Error"]["Code"] == "InvalidRequestException":
            raise e
        elif e.response["Error"]["Code"] == "ResourceNotFoundException":
            raise e

    # Decrypts secret using the associated KMS CMK.
    # Depending on whether the secret is a string or binary, one of these fields will be populated.
    if get_secret_value_response is None:
        raise ValueError("Secret value is None. This resource possibly does not have permissions.")

    if "SecretString" not in get_secret_value_response:
        raise ValueError("Secret value is not a string.")

    return get_secret_value_response["SecretString"]


def get_secret_from_env_var_or_secrets_manager(
    secret_env_var_name: Optional[str] = None,
    secret_name: Optional[str] = None,
    aws_region: Optional[str] = None,
) -> str:
    """Fetches a secret from either an environment variable or AWS Secrets Manager.

    First checks if the secret is available as an environment variable. If not, then
    the secret is fetched from AWS Secrets Manager.

    Args:
        secret_env_var_name (Optional[str], optional): The name of the environment variable to check. Defaults to None.
        secret_name (Optional[str], optional): The name of the secret in AWS Secrets Manager. Defaults to None.
        aws_region (Optional[str], optional): The AWS region to use to check for the secret. Defaults to None.

    Raises:
        ValueError: If no secret is specified, ie both secret_env_var_name and (secret_name or aws_region) are None.
    Returns:
        str: _description_
    """
    if secret_env_var_name is not None:
        value = os.getenv(secret_env_var_name)
        if value is not None:
            return value
    if secret_name is None:
        raise ValueError("No secret specified")
    if aws_region is None:
        raise ValueError("No AWS region specified")

    return get_secret_from_secrets_manager(
        secret_name=secret_name,
        region_name=aws_region,
    )
