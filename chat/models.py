from django.db import models

# Create your models here.
from django.contrib.auth.models import User


class Message(models.Model):

    sender = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='sender'
    )

    receiver = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='receiver'
    )

    is_deleted = models.BooleanField(
    default=False
    )

    is_seen = models.BooleanField(
    default=False
    )

    message = models.TextField()

    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.sender.username
    
class Profile(models.Model):

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE
    )

    image = models.ImageField(
        upload_to='profile/',
        default='default.png'
    )
    last_seen = models.DateTimeField(
    auto_now=True
    )

    is_online = models.BooleanField(
    default=False
    )

    def __str__(self):

        return self.user.username