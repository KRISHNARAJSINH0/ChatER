import json

from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async


class ChatConsumer(AsyncWebsocketConsumer):

    async def connect(self):

        self.room_name = self.scope['url_route']['kwargs']['room_name']

        self.room_group_name = f'chat_{self.room_name}'

        await self.channel_layer.group_add(

            self.room_group_name,

            self.channel_name

        )

        await self.accept()

        print("CONNECTED")

    async def disconnect(self, close_code):

        print("DISCONNECTED")

    async def receive(self, text_data):

        data = json.loads(text_data)

        msg_type = data.get('type')
        sender = data.get('sender')
        receiver = data.get('receiver')

        # Handle Real-Time Read Receipts
        if msg_type == 'seen_receipt':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_seen_receipt',
                    'sender': sender
                }
            )
            # Silently update database in background
            await self.mark_messages_seen(sender, receiver)
            return

        message = data['message']
        sender_id = data.get('sender_id')

        # Send message to active chat room group
        await self.channel_layer.group_send(

            self.room_group_name,

            {

                'type': 'chat_message',

                'message': message,

                'sender': sender

            }

        )
        
        # Also broadcast to receiver's personal notifications channel in the background
        if receiver and receiver != sender:
            receiver_group = f"notification_{receiver}"
            import datetime
            now_str = datetime.datetime.now().strftime("%I:%M %p")
            await self.channel_layer.group_send(
                receiver_group,
                {
                    'type': 'user_notification',
                    'message': message,
                    'sender': sender,
                    'sender_id': sender_id,
                    'timestamp': now_str
                }
            )

    async def chat_message(self, event):

        await self.send(text_data=json.dumps({

            'message': event['message'],

            'sender': event['sender']

        }))

    async def chat_seen_receipt(self, event):
        await self.send(text_data=json.dumps({
            'type': 'seen_receipt',
            'sender': event['sender']
        }))

    @database_sync_to_async
    def mark_messages_seen(self, sender_username, receiver_username):
        from django.contrib.auth.models import User
        from .models import Message
        try:
            sender = User.objects.get(username=sender_username)
            receiver = User.objects.get(username=receiver_username)
            # All messages sent by receiver (which is now seen by sender) are marked True
            Message.objects.filter(sender=receiver, receiver=sender, is_seen=False).update(is_seen=True)
        except Exception as e:
            print("Error marking messages as seen: ", e)


class NotificationConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        user = self.scope.get('user')
        if user and user.is_authenticated:
            self.user_group_name = f"notification_{user.username}"
            
            await self.channel_layer.group_add(
                self.user_group_name,
                self.channel_name
            )
            await self.accept()
            print(f"Global Notification socket connected for user: {user.username}")
        else:
            await self.close()

    async def disconnect(self, close_code):
        user = self.scope.get('user')
        if user and user.is_authenticated:
            await self.channel_layer.group_discard(
                self.user_group_name,
                self.channel_name
            )
            print(f"Global Notification socket disconnected for user: {user.username}")

    async def user_notification(self, event):
        # Transmit the notification data payload to the client
        await self.send(text_data=json.dumps({
            'message': event['message'],
            'sender': event['sender'],
            'sender_id': event.get('sender_id'),
            'timestamp': event['timestamp']
        }))