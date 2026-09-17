from openai import OpenAI

client = OpenAI(
    base_url="https://api.unorouter.com/v1",
    api_key="sk-faXYvhqiEdA2rHaULCPWIrO6AbuYykcoAckLdqkwO2Rm0fLU",
)

res = client.chat.completions.create(
    model="gemini-3.6-flash:free",
    messages=[{"role": "user", "content": "Hello!"}],
)

print(res.choices[0].message.content)