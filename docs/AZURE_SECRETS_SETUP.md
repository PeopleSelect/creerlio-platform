# Azure Secrets Setup Guide

This guide explains how to securely manage secrets and API keys for the Creerlio Platform using Azure Key Vault.

## Why Use Azure Key Vault?

- **Security**: Centralized secret management
- **Rotation**: Easy key rotation without code changes
- **Access Control**: Fine-grained permissions
- **Audit**: Track who accessed what secrets
- **Compliance**: Meet security and compliance requirements

## Step 1: Create Azure Key Vault

```bash
# Set variables
RESOURCE_GROUP="creerlio-platform-rg"
KEY_VAULT_NAME="creerlio-kv-$(date +%s)"  # Must be globally unique
LOCATION="eastus"

# Create Key Vault
az keyvault create \
    --name $KEY_VAULT_NAME \
    --resource-group $RESOURCE_GROUP \
    --location $LOCATION \
    --enabled-for-deployment true \
    --enabled-for-template-deployment true \
    --enabled-for-disk-encryption true
```

## Step 2: Add Secrets to Key Vault

### Add OpenAI API Key

```bash
az keyvault secret set \
    --vault-name $KEY_VAULT_NAME \
    --name "OpenAI-API-Key" \
    --value "your-openai-api-key-here"
```

### Add Google Maps API Key

```bash
az keyvault secret set \
    --vault-name $KEY_VAULT_NAME \
    --name "GoogleMaps-API-Key" \
    --value "your-google-maps-api-key-here"
```

### Add Database Connection String

```bash
az keyvault secret set \
    --vault-name $KEY_VAULT_NAME \
    --name "Database-ConnectionString" \
    --value "postgresql://user:password@host:5432/dbname"
```

### Add Secret Key

```bash
az keyvault secret set \
    --vault-name $KEY_VAULT_NAME \
    --name "Secret-Key" \
    --value "your-secret-key-here"
```

### Add Mapbox API Key (Optional)

```bash
az keyvault secret set \
    --vault-name $KEY_VAULT_NAME \
    --name "Mapbox-API-Key" \
    --value "your-mapbox-api-key-here"
```

## Step 3: Grant Access to App Service

### Get App Service Identity

```bash
WEB_APP_NAME="creerlio-platform"
RESOURCE_GROUP="creerlio-platform-rg"

# Enable system-assigned managed identity
az webapp identity assign \
    --name $WEB_APP_NAME \
    --resource-group $RESOURCE_GROUP
```

### Grant Key Vault Access

```bash
# Get the principal ID
PRINCIPAL_ID=$(az webapp identity show \
    --name $WEB_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --query principalId -o tsv)

# Grant access
az keyvault set-policy \
    --name $KEY_VAULT_NAME \
    --object-id $PRINCIPAL_ID \
    --secret-permissions get list
```

## Step 4: Configure App Service to Use Key Vault

### Option A: Reference Secrets in App Settings

```bash
# Reference secrets in app settings
az webapp config appsettings set \
    --name $WEB_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --settings \
        OPENAI_API_KEY="@Microsoft.KeyVault(SecretUri=https://$KEY_VAULT_NAME.vault.azure.net/secrets/OpenAI-API-Key/)" \
        GOOGLE_MAPS_API_KEY="@Microsoft.KeyVault(SecretUri=https://$KEY_VAULT_NAME.vault.azure.net/secrets/GoogleMaps-API-Key/)" \
        DATABASE_URL="@Microsoft.KeyVault(SecretUri=https://$KEY_VAULT_NAME.vault.azure.net/secrets/Database-ConnectionString/)" \
        SECRET_KEY="@Microsoft.KeyVault(SecretUri=https://$KEY_VAULT_NAME.vault.azure.net/secrets/Secret-Key/)"
```

### Option B: Use Azure Key Vault SDK in Code

Update `backend/app/config.py`:

```python
from azure.keyvault.secrets import SecretClient
from azure.identity import DefaultAzureCredential

def get_secret_from_keyvault(secret_name: str) -> str:
    """Get secret from Azure Key Vault"""
    key_vault_url = os.getenv("AZURE_KEY_VAULT_URL")
    if not key_vault_url:
        return os.getenv(secret_name)
    
    credential = DefaultAzureCredential()
    client = SecretClient(vault_url=key_vault_url, credential=credential)
    secret = client.get_secret(secret_name)
    return secret.value

# Usage
OPENAI_API_KEY = get_secret_from_keyvault("OpenAI-API-Key")
```

## Step 5: Update Environment Variables

Set the Key Vault URL in app settings:

```bash
az webapp config appsettings set \
    --name $WEB_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --settings \
        AZURE_KEY_VAULT_URL="https://$KEY_VAULT_NAME.vault.azure.net/"
```

## Step 6: Verify Access

Test that your application can access secrets:

```bash
# SSH into app
az webapp ssh --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP

# Test secret access (in Python)
python -c "
from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient
import os

key_vault_url = os.getenv('AZURE_KEY_VAULT_URL')
credential = DefaultAzureCredential()
client = SecretClient(vault_url=key_vault_url, credential=credential)
secret = client.get_secret('OpenAI-API-Key')
print('Secret retrieved successfully!')
"
```

## Secret Rotation

### Rotate a Secret

```bash
# Update secret value
az keyvault secret set \
    --vault-name $KEY_VAULT_NAME \
    --name "OpenAI-API-Key" \
    --value "new-api-key-value"
```

The app will automatically pick up the new value on next restart or when it refreshes.

### Enable Auto-Rotation (Advanced)

For automatic secret rotation, use Azure Key Vault with Event Grid:

```bash
# Create Event Grid subscription for secret rotation
az eventgrid event-subscription create \
    --name keyvault-secret-rotation \
    --source-resource-id /subscriptions/{subscription-id}/resourceGroups/{rg}/providers/Microsoft.KeyVault/vaults/{vault-name} \
    --endpoint-type webhook \
    --endpoint https://your-function-app.azurewebsites.net/api/rotate-secret
```

## Best Practices

1. **Never Commit Secrets**: Always use Key Vault, never hardcode
2. **Least Privilege**: Grant minimum required permissions
3. **Separate Environments**: Use different Key Vaults for dev/staging/prod
4. **Monitor Access**: Enable logging and monitor secret access
5. **Regular Rotation**: Rotate secrets regularly (every 90 days recommended)
6. **Version Secrets**: Key Vault automatically versions secrets

## Access Control

### Grant Access to Specific Users

```bash
USER_EMAIL="user@example.com"

# Get user object ID
USER_ID=$(az ad user show --id $USER_EMAIL --query id -o tsv)

# Grant access
az keyvault set-policy \
    --name $KEY_VAULT_NAME \
    --object-id $USER_ID \
    --secret-permissions get list
```

### Revoke Access

```bash
az keyvault delete-policy \
    --name $KEY_VAULT_NAME \
    --object-id $USER_ID
```

## Monitoring and Logging

### Enable Diagnostic Logging

```bash
# Create Log Analytics workspace
az monitor log-analytics workspace create \
    --resource-group $RESOURCE_GROUP \
    --workspace-name creerlio-logs

# Enable Key Vault logging
az monitor diagnostic-settings create \
    --name keyvault-diagnostics \
    --resource /subscriptions/{subscription-id}/resourceGroups/{rg}/providers/Microsoft.KeyVault/vaults/{vault-name} \
    --workspace creerlio-logs \
    --logs '[{"category":"AuditEvent","enabled":true}]'
```

## Troubleshooting

### Common Issues

1. **403 Forbidden**
   - Check managed identity is enabled
   - Verify Key Vault access policy
   - Ensure correct permissions (get, list)

2. **Secret Not Found**
   - Verify secret name is correct
   - Check Key Vault name and URL
   - Ensure secret exists in Key Vault

3. **Authentication Failed**
   - Verify managed identity is assigned
   - Check Azure AD permissions
   - Review Key Vault firewall rules

### Test Access

```bash
# List secrets (should work if permissions are correct)
az keyvault secret list --vault-name $KEY_VAULT_NAME

# Get specific secret
az keyvault secret show --vault-name $KEY_VAULT_NAME --name "OpenAI-API-Key"
```

## Security Checklist

- [ ] Key Vault created with proper access controls
- [ ] Managed identity enabled on App Service
- [ ] Key Vault access policy configured
- [ ] All secrets stored in Key Vault
- [ ] No secrets in code or configuration files
- [ ] Diagnostic logging enabled
- [ ] Secret rotation process documented
- [ ] Access reviewed regularly

## Next Steps

- Review [AZURE_DEPLOYMENT_SETUP.md](./AZURE_DEPLOYMENT_SETUP.md) for deployment
- Set up secret rotation automation
- Configure monitoring and alerts
- Document secret management procedures for your team



