# app/deps.py
from fastapi import Request

def get_settings(request: Request):
    return request.app.state.settings

def get_store(request: Request):
    return request.app.state.store

def get_conn_mgr(request: Request):
    return request.app.state.conn_mgr
