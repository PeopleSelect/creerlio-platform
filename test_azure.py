from dotenv import load_dotenv
import os
from azure.ai.inference import ChatCompletionsClient
from azure.core.credentials import AzureKeyCredential

# Load .env
load_dotenv(dotenv_path=".env")

endpoint = os.getenv("AZURE_ENDPOINT")
key = os.getenv("AZURE_API_KEY")

print("Endpoint:", endpoint)
print("API key loaded:", key is not None)

client = ChatCompletionsClient(
    endpoint=endpoint,
    credential=AzureKeyCredential(key)
)

response = client.complete(
    messages=[
        {"role": "user", "content": "Hello! Say hi back."}
    ],
    model="gpt-4o-mini"  # This model is available in Azure's default catalog
)

print("\n=== RESPONSE ===")
print(response.choices[0].message["content"])

