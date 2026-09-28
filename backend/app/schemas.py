from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator


class Credentials(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class SignUp(Credentials):
    name: str = Field(min_length=2, max_length=100)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 2:
            raise ValueError("Name must contain at least two characters.")
        return value


class ProfileUpdate(BaseModel):
    name: str = Field(min_length=2, max_length=100)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 2:
            raise ValueError("Name must contain at least two characters.")
        return value


class TransactionInput(BaseModel):
    type: Literal["Income", "Expense"]
    amount: float = Field(gt=0, le=999999999)
    category: str = Field(min_length=1, max_length=50)
    description: str = Field(min_length=1, max_length=120)
    date: date

    @field_validator("category", "description")
    @classmethod
    def strip_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be blank.")
        return value

    @model_validator(mode="after")
    def validate_category_for_type(self):
        income_categories = {"Salary", "Freelance", "Business", "Investment return", "Gift", "Other income"}
        allowed = income_categories if self.type == "Income" else {"Food", "Transport", "Education", "Shopping", "Bills", "Entertainment", "Healthcare", "Others"}
        if self.category not in allowed:
            raise ValueError("Choose a supported category for this transaction type.")
        return self


class ChatInput(BaseModel):
    question: str = Field(min_length=1, max_length=1000)


class UserOutput(BaseModel):
    id: int
    name: str
    email: EmailStr
    model_config = ConfigDict(from_attributes=True)