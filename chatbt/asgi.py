import os

from channels.routing import ProtocolTypeRouter
from channels.routing import URLRouter

from channels.auth import AuthMiddlewareStack

from django.core.asgi import get_asgi_application

import chat.routing


os.environ.setdefault(
    'DJANGO_SETTINGS_MODULE',
    'chatbt.settings'
)

application = ProtocolTypeRouter({

    "http": get_asgi_application(),

    "websocket": AuthMiddlewareStack(

        URLRouter(

            chat.routing.websocket_urlpatterns

        )

    ),

})